#!pip install --upgrade transformers==4.6.1
import time
import copy
import torch
import torch.optim as optim
from torch.utils.data import DataLoader
import torch.nn as nn
from torchvision import datasets, models, transforms
from torchvision.io import read_image
from torch.utils.data import Dataset
from PIL import Image
import os
from shutil import copyfile
from collections import Counter
import csv
import sklearn.metrics
#from transformers import ViTForImageClassification

#import warnings
#warnings.filterwarnings('ignore')

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
N_MEAN = [0.485, 0.456, 0.406]
N_STD = [0.229, 0.224, 0.225]
#N_MEAN = [0.5, 0.5, 0.5]
#N_STD = [0.5, 0.5, 0.5]
IMAGE_SIZE = 512
print(device)

#**************KAGGLE STUFF************************
INPUT_DIR = '/kaggle/input/plant-pathology-2021-fgvc8/'
DATA_DIR = '/kaggle/input/'
WORKING_DIR = '/kaggle/working/'
#copyfile('/kaggle/input/resnet152v6epoch11/resnet152_v6_epoch11.pth', WORKING_DIR + 'model.pth')
#**************LOCAL STUFF***********************
#INPUT_DIR = './../plant-pathology-2021-fgvc8/'
#DATA_DIR = './../plant-pathology-2021-fgvc8/'
#DATA_DIR = './'
#WORKING_DIR = './'
#copyfile(WORKING_DIR + 'densenet169_v21_epoch10.pth', WORKING_DIR + 'model.pth')


def count_labels(file_path):
    with open(file_path, mode='r') as my_file:
        csv_reader = csv.DictReader(my_file)
        counter = Counter()
        for row in csv_reader:
            counter.update({row['labels']: 1})
        sorted_counter = sorted(counter.items())
        print(sorted_counter)
        print(len(sorted_counter))

#count_labels('submission.csv')


class PreprocessedDataset(Dataset):
    def __init__(self, images_path, labels_path, transform=None, target_transform=None):
        self.images = torch.load(images_path)
        self.labels = torch.load(labels_path)
        self.length = self.labels.size(0)
        self.transform = transform
        self.target_transform = target_transform

    def __len__(self):
        return self.length

    def __getitem__(self, idx):
        return self.transform(self.images[idx]), self.labels[idx].float()

#full dataset
class BigDataset(Dataset):
    def __init__(self, csv_path, img_dir, transform=None, target_transform=None):
        self.filenames = []
        self.labels = []
        with open(csv_path, mode='r') as my_file:
            csv_reader = csv.DictReader(my_file)
            for row in csv_reader:
                self.filenames.append(row['image'])
                self.labels.append(row['labels'])

        self.img_dir = img_dir
        self.transform = transform
        self.target_transform = target_transform

    def __len__(self):
        return len(self.filenames) #equal to self.labels

    def __getitem__(self, idx):
        img_path = os.path.join(self.img_dir, self.filenames[idx])
        image = read_image(img_path)
        if self.transform:
            image = self.transform(image)
    
        label = self.labels[idx]
        if self.target_transform:
            label = self.target_transform(label)

        return image, label

class TestDataset(Dataset):
    def __init__(self, img_dir, transform=None):
        self.filenames = []
        for root, dirs, files in os.walk(img_dir):
            for file in files:
                if file.endswith('.jpg'):
                    self.filenames.append(file)
        self.img_dir = img_dir
        self.transform = transform

    def __len__(self):
        return len(self.filenames)

    def __getitem__(self, idx):
        img_path = os.path.join(self.img_dir, self.filenames[idx])
        #image = Image.open(img_path)
        image = read_image(img_path)
        if self.transform:
            image = self.transform(image)
        return image, self.filenames[idx]


def encode_topic(topic):
    topics = {
            'complex':              0,
            'frog_eye_leaf_spot':   1, 
            'powdery_mildew':       2, 
            'rust':                 3, 
            'scab':                 4
            }

    word_list = topic.split()
    encoded = torch.zeros(5)
    for word in word_list:
        if word != 'healthy':
            encoded[topics[word]] = 1.
    return encoded

def decode_topic(topic):
    max_idx = torch.argmax(topic)
    topic = torch.sigmoid(topic).round().int()
    topics = [
            'complex',
            'frog_eye_leaf_spot',
            'healthy',
            'powdery_mildew',
            'rust',
            'scab'
            ]
    text = ''
    for i, val in enumerate(topic):
        if val == 1:
            text += topics[i] + ' '

    if text == '':
        #text = 'healthy'
        text = topics[max_idx]
    
    return text

def init_model(model_name):
    num_classes = 5
    model = None

    #input size to all 3 models are 3x224x224
    if model_name == 'vgg':
        model = models.vgg11_bn(pretrained=True)
        for params in model.parameters():
            params.requires_grad = False
        num_ftrs = model.classifier[6].in_features
        model.classifier[6] = nn.Linear(num_ftrs, num_classes)
    elif model_name == "resnet18":
        model = models.resnet18(pretrained=True)
        for params in model.parameters():
            params.requires_grad = False
        num_ftrs = model.fc.in_features
        model.fc = nn.Linear(num_ftrs, num_classes)
    elif model_name == "resnet50":
        model = models.resnet50(pretrained=True)
        for params in model.parameters():
            params.requires_grad = False
        num_ftrs = model.fc.in_features
        model.fc = nn.Linear(num_ftrs, num_classes)
    elif model_name == "resnet152":
        model = models.resnet152(pretrained=True)
        for params in model.parameters():
            params.requires_grad = False
        num_ftrs = model.fc.in_features
        model.fc = nn.Linear(num_ftrs, num_classes) #requires_grad is true by default
    elif model_name == "wide_resnet101_2":
        model = models.wide_resnet101_2(pretrained=True)
        for params in model.parameters():
            params.requires_grad = False
        num_ftrs = model.fc.in_features
        model.fc = nn.Linear(num_ftrs, num_classes) #requires_grad is true by default
        #model.fc = nn.Sequential(nn.Dropout(p=0.5), nn.Linear(num_ftrs, num_classes))
    elif model_name == "densenet169":
        model = models.densenet169(pretrained=True)
        for params in model.parameters(): 
            params.requires_grad = False
        num_ftrs = model.classifier.in_features #classifier is the last layer, which is the first layer
        model.classifier = nn.Linear(num_ftrs, num_classes) #make this nn.Sequential with drop out applied first, then a linear classifier
    elif model_name == "vit":
        model = ViTForImageClassification.from_pretrained('google/vit-base-patch16-224')
        for params in model.parameters(): 
            params.requires_grad = False
        num_ftrs = model.classifier.in_features #classifier is the last layer, which is the first layer
        model.classifier = nn.Linear(num_ftrs, num_classes) #make this nn.Sequential with drop out applied first, then a linear classifier
    elif model_name == "vit384":
        model = ViTForImageClassification.from_pretrained('google/vit-base-patch16-384')
        for params in model.parameters(): 
            params.requires_grad = False
        num_ftrs = model.classifier.in_features #classifier is the last layer, which is the first layer
        #model.classifier = nn.Linear(num_ftrs, num_classes) #make this nn.Sequential with drop out applied first, then a linear classifier
        model.classifier = nn.Sequential(
                            nn.Linear(num_ftrs, 1024), 
                            nn.ReLU(), 
                            nn.Linear(1024, 256), 
                            nn.ReLU(), 
                            nn.Linear(256, 64), 
                            nn.ReLU(), 
                            nn.Linear(64, num_classes))
    elif model_name == "vit21k":
        model = ViTForImageClassification.from_pretrained('google/vit-base-patch16-224-in21k')
        for params in model.parameters(): 
            params.requires_grad = False
        num_ftrs = model.classifier.in_features #classifier is the last layer, which is the first layer
        model.classifier = nn.Linear(num_ftrs, num_classes) #make this nn.Sequential with drop out applied first, then a linear classifier
    else:
        print("Invalid model name, exiting...")
        exit()
    
    return model


def print_gpu_usage():
    torch.cuda.empty_cache()
    t = torch.cuda.get_device_properties(0).total_memory / 1024.**2
    r = torch.cuda.memory_reserved(0) / 1024.**2
    a = torch.cuda.memory_allocated(0) / 1024.**2
    f = r - a
    print(t)
    print(r)
    print(a)
    print(f)

#*********************************************START OF NEW STUFF************************
#'healthy' is mutually exclusive, so we append it if no diseases are present
def append_healthy(x):
    y = [torch.sum(i) for i in x[:,:5]]
    y = torch.stack(y, dim=0)
    y = (~(y.bool())).int()
    y = torch.unsqueeze(y, dim=1)
    return torch.hstack((x, y)).int()


def train(model, loader, criterion, optimizer):
    model.train()
    average_loss = 0.0
    average_f1 = 0.0
        
    for inputs, labels in loader:
        inputs = inputs.to(device)
        labels = labels.to(device)

        optimizer.zero_grad(set_to_none=True)
        with torch.set_grad_enabled(True):
            outputs = model(inputs) #TODO add logits for vit
            loss = criterion(outputs, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.)
            optimizer.step()

        outputs = append_healthy(torch.round(torch.sigmoid(outputs)).int())
        labels = append_healthy(torch.round(labels).int())

        average_loss += loss.item() * labels.size(0) / len(loader.dataset)
        average_f1 += sklearn.metrics.f1_score(labels.to('cpu'), outputs.to('cpu'), average="samples") * labels.size(0) / len(loader.dataset)
        torch.cuda.empty_cache()

    return average_loss, average_f1

def evaluate(model, loader, criterion, optimizer):
    model.eval()
    average_loss = 0.0
    average_f1 = 0.0
    for inputs, labels in loader:
        inputs = inputs.to(device)
        labels = labels.to(device)

        with torch.set_grad_enabled(False):
            outputs = model(inputs) #TODO add logits for vit
            loss = criterion(outputs, labels)

            #_, preds = torch.max(outputs, 1) #same as argmax with value thrown out, and index kept
        outputs = torch.sigmoid(outputs)
        outputs = append_healthy(torch.round(outputs).int())
        labels = append_healthy(torch.round(labels).int())

        average_loss += loss.item() * labels.size(0) / len(loader.dataset)
        average_f1 += sklearn.metrics.f1_score(labels.to('cpu'), outputs.to('cpu'), average="samples") * labels.size(0) / len(loader.dataset)
        torch.cuda.empty_cache()

    return average_loss, average_f1



def collate_train_batch(batch):
    #transform = transforms.Compose([transforms.RandomResizedCrop((IMAGE_SIZE, IMAGE_SIZE), scale=(0.8, 1.0), ratio=(0.75, 1.33)), 
    transform = transforms.Compose([
                        transforms.RandomHorizontalFlip(), 
                        transforms.RandomVerticalFlip(), 
                        transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1, hue=0.1)])
    images = []
    labels = []
    for image, label in batch:
        images.append(transform(image).unsqueeze(0))
        labels.append(label.unsqueeze(0))

    return torch.cat(images), torch.cat(labels)

def collate_valid_batch(batch):
    transform = transforms.Compose([transforms.Resize(IMAGE_SIZE)])
    images = []
    labels = []
    for image, label in batch:
        images.append(transform(image).unsqueeze(0))
        labels.append(label.unsqueeze(0))

    return torch.cat(images), torch.cat(labels)

def add_grad(model, layer_name):
    l = len(layer_name)
    for name, parameters in model.named_parameters():
        if name[0:l] == layer_name:
            parameters.requires_grad = True

def train_model_processed(epochs, offset, model_name, version):
    torch.cuda.empty_cache()
    #model = init_model(model_name)
    model = torch.load(DATA_DIR + 'densenet169v1epoch3/densenet169_v1_epoch3.pth', map_location=device)


    model = model.to(device)


    batch_size = 32 #TODO 128 for classifier only, 32 or 16 for entire network


    best_valid_f1 = [0.]

    lr = 0.03

    for epoch in range(0, epochs):
        torch.cuda.empty_cache()

        #if epoch % 5 == 0:
        #    lr *= 0.5

        for name, parameters in model.named_parameters():
            parameters.requires_grad = False

        add_grad(model, 'classifier')
        #add_grad(model, 'vit.layernorm')
        #add_grad(model, 'vit.encoder.layer.11')
        #add_grad(model, 'vit.encoder.layer.10')
        #add_grad(model, 'vit.encoder.layer.9')

        if epoch + offset >= 3:
            for name, parameters in model.named_parameters():
                parameters.requires_grad = True


        params_to_update = []
        for name, param in model.named_parameters():
            if param.requires_grad == True:
                params_to_update.append(param)

        optimizer = optim.SGD(params_to_update, lr=lr, momentum=0.9)
        criterion = nn.BCEWithLogitsLoss()

        print('Epoch ' + str(epoch + offset + 1))

        train_loss = 0.
        train_f1 = 0.

        for i in range(0, 9):
            train_data = PreprocessedDataset(DATA_DIR + '384modfive/384-mod/images_matrix_384px_' + str(i) + '.pt', 
                                            DATA_DIR + '384modfive/384-mod/labels_matrix_384px_' + str(i) + '.pt',
                                    transform=transforms.Compose([transforms.ConvertImageDtype(torch.float), transforms.Normalize(N_MEAN, N_STD)]), 
                                    target_transform=transforms.Compose([transforms.ConvertImageDtype(torch.float)]))

            train_loader = DataLoader(train_data, batch_size=batch_size, shuffle=True, pin_memory=True, num_workers=1, collate_fn=collate_train_batch)

            this_loss, this_f1 = train(model, train_loader, criterion, optimizer)#TODO uncomment after checking if it works
            train_loss += this_loss/9.
            train_f1 += this_f1/9.


        print('{} Loss: {:.4f} Acc. {:.4f}'.format('training', train_loss, train_f1)) 

        valid_data = PreprocessedDataset(DATA_DIR + '384modfive/384-mod/images_matrix_384px_9.pt', DATA_DIR + '384modfive/384-mod/labels_matrix_384px_9.pt',
                                transform=transforms.Compose([transforms.ConvertImageDtype(torch.float), transforms.Normalize(N_MEAN, N_STD)]), 
                                target_transform=transforms.Compose([transforms.ConvertImageDtype(torch.float)]))

        valid_loader = DataLoader(valid_data, batch_size=batch_size, shuffle=True, pin_memory=True, num_workers=1, collate_fn=collate_valid_batch)
        valid_loss, valid_f1 = evaluate(model, valid_loader, criterion, optimizer)
        torch.cuda.empty_cache()


        print('{} Loss: {:.4f} Acc. {:.4f}'.format('validation', valid_loss, valid_f1))

        print(lr)

        with open("valid_acc_" + model_name + '_' + version + ".txt", "a") as myFile:
            myFile.write("Epoch " + str(epoch + offset + 1) + "\n")
            myFile.write("Training: " + str(train_loss) + ", " + str(train_f1.item()) + '\n')
            myFile.write("Validation: " + str(valid_loss) + ", " + str(valid_f1.item()) + '\n')
            myFile.write("**********************************************\n")

        torch.save(model, model_name + '_' + version + '_epoch' + str(epoch + offset + 1) + '.pth')
        best_valid_f1.append(valid_f1)


#train_model_processed(7, 3, 'densenet169', 'v1')



def train_model_raw(epochs, offset, model_name, version):
    torch.cuda.empty_cache()
    #model = init_model(model_name) #should have function just return model (then can save or use directly)
    model = torch.load(DATA_DIR + 'densenet169v8epoch30/densenet169_v8_epoch30.pth', map_location=device)

    for name, parameters in model.named_parameters():
        if name[0:10] == 'classifier':
            parameters.requires_grad = True
        if name[0:14] == 'features.norm5':
            parameters.requires_grad = True
        if name[0:20] == 'features.denseblock4':
            parameters.requires_grad = True
        if name[0:20] == 'features.transition3':
            parameters.requires_grad = True
        if name[0:20] == 'features.denseblock3':
            parameters.requires_grad = True

    model = model.to(device)


    batch_size = 64 #TODO 

    train_data = BigDataset(DATA_DIR + '/splitdata/split_train.csv', DATA_DIR + '/600pxtrainimages/600x600_train_images',
                            transform=transforms.Compose([transforms.ConvertImageDtype(torch.float),
                                                        transforms.Normalize(N_MEAN, N_STD)]), 
                            target_transform=encode_topic)
    valid_data = BigDataset(DATA_DIR + '/splitdata/split_valid.csv', DATA_DIR + '/600pxtrainimages/600x600_train_images',
                            transform=transforms.Compose([transforms.ConvertImageDtype(torch.float),
                                                        transforms.Normalize(N_MEAN, N_STD)]), 
                            target_transform=encode_topic)


    train_loader = DataLoader(train_data, batch_size=batch_size, shuffle=True, pin_memory=True, num_workers=1, collate_fn=collate_train_batch)
    valid_loader = DataLoader(valid_data, batch_size=batch_size, shuffle=True, pin_memory=True, num_workers=1, collate_fn=collate_valid_batch)

    params_to_update = []
    for name, param in model.named_parameters():
        if param.requires_grad == True:
            params_to_update.append(param)
    optimizer = optim.SGD(params_to_update, lr=1e-3, momentum=0.9, weight_decay=0.0001)
    criterion = nn.BCEWithLogitsLoss()

    best_valid_f1 = [0.]


    for epoch in range(0, epochs):
        torch.cuda.empty_cache()
        print('Epoch ' + str(epoch + offset + 1))

        train_loss, train_f1 = train(model, train_loader, criterion, optimizer)

        print('{} Loss: {:.4f} Acc. {:.4f}'.format('training', train_loss, train_f1)) 

        valid_loss, valid_f1 = evaluate(model, valid_loader, criterion, optimizer)

        print('{} Loss: {:.4f} Acc. {:.4f}'.format('validation', valid_loss, valid_f1))

        with open(WORKING_DIR + "valid_acc_" + model_name + '_' + version + ".txt", "a") as myFile:
            myFile.write("Epoch " + str(epoch + offset + 1) + "\n")
            myFile.write("Training: " + str(train_loss) + ", " + str(train_f1.item()) + '\n')
            myFile.write("Validation: " + str(valid_loss) + ", " + str(valid_f1.item()) + '\n')
            myFile.write("**********************************************\n")

        torch.save(model, WORKING_DIR + model_name + '_' + version + '_epoch' + str(epoch + offset + 1) + '.pth')
        best_valid_f1.append(valid_f1)

#v16 - preprocessed 512x512 - no augmentation
#train_model_raw(20, 30, 'densenet169', 'v9')
#***********************************************************************************
#version 1: training only classifier to epoch 50 at lr=1e-3,
#train version 1 for a little longer since the validation accuracy/loss is still going down
#version 2: training entire network from version 1 epoch 50, at lr=1e-4
#version 3: weight decay=1e-4 but with more augmentation of 600x600 set
    #epoch 1 - 10 lr = 1e-2
    #epochs 11 -20 lr =1e-3
#version 4: epochs 50 - 91: lr = 1e-4, wd=1e-4, momentum=0.9, all layers trained
#version 7: (pretrained) using size 224 (wd 1e-4)
    #training classifier at 1e-2 for 5 epochs
    #training entire model at 1e-3 for 5 epochs

def test():
    torch.cuda.empty_cache()
    model = torch.load('densenet169_v7_epoch10.pth', map_location=device)

    #uncomment with block to train entire network
    for name, parameters in model.named_parameters():
        if name[0:10] == 'classifier':
            parameters.requires_grad = True
        if name[0:14] == 'features.norm5':
            parameters.requires_grad = True
        if name[0:20] == 'features.denseblock4':
            parameters.requires_grad = True
        if name[0:20] == 'features.transition3':
            parameters.requires_grad = True
        if name[0:20] == 'features.denseblock3':
            parameters.requires_grad = True

        if parameters.requires_grad:
            print(name)

class Ensemble(nn.Module):
    def __init__(self, model1, model2, model3):
        super(Ensemble, self).__init__()
        self.model1 = model1
        self.model2 = model2
        self.model3 = model3

        for param in model1.parameters():
            param.requires_grad = False
        for param in model2.parameters():
            param.requires_grad = False
        for param in model3.parameters():
            param.requires_grad = False

    def forward(self, x):
        preds1 = self.model1(x.clone())
        preds2 = self.model2(x.clone())
        preds3 = self.model3(x.clone())

        return preds1 + preds2 + preds3

def predict():
    torch.cuda.empty_cache()
    model1 = torch.load(DATA_DIR + 'densenetensemble2/densenet169_v2_epoch45.pth', map_location=device)
    model2 = torch.load(DATA_DIR + 'densenetensemble2/densenet169_v2_epoch48.pth', map_location=device)
    model3 = torch.load(DATA_DIR + 'densenetensemble2/densenet169_v2_epoch50.pth', map_location=device)
    model = Ensemble(model1, model2, model3)
#    model = torch.load(DATA_DIR + 'densenetensemble/densenet169_v2_epoch48.pth', map_location=device)
    model.eval()
    model = model.to(device)

    toFloat = transforms.ConvertImageDtype(torch.float)
    normalize = transforms.Normalize(N_MEAN, N_STD)
    scale = transforms.Resize(IMAGE_SIZE) 
    crop = transforms.CenterCrop(IMAGE_SIZE)

    test_data = TestDataset(INPUT_DIR + 'test_images',  #TODO change back
                            transform=transforms.Compose([toFloat, normalize, scale, crop]))

    batch_size = 128 #TODO 256 works for 1 linear classifier vit384, 8 for local GPU
    test_loader = DataLoader(test_data, batch_size=batch_size, shuffle=False, pin_memory=True, num_workers=1) #TODO change back

    my_file = open('submission.csv', 'w')
    my_file.write('image,labels')
    
    for i, (imgs, filenames) in enumerate(test_loader):
        torch.cuda.empty_cache()
        imgs = imgs.to(device)
        with torch.set_grad_enabled(False): #need this otherwise pytorch allocates a ton of memory for gradients
            preds = model(imgs) #TODO remove logits for ensemble

        for filename, pred in zip(filenames, preds):
            label = decode_topic(pred) #pass in raw floats (decode topic will apply sigmoid, etc)
            my_file.write('\n' + filename + ',' + label)

    my_file.close()


predict()
