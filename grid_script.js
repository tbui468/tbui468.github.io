//have html document queries only inside functions prepended with 'html'

function distance_squared(x1, y1, x2, y2) {
  let dy = y1 - y2;
  let dx = x1 - x2;
  return dy * dy + dx * dx;
}

function get_cursor_position(canvas) {
  const rect = canvas.getBoundingClientRect();
  const xpos = event.clientX - rect.left;
  const ypos = event.clientY - rect.top;

  return [xpos, ypos];
}

function handle_click(canvas, event) {
  const [xpos, ypos] = get_cursor_position(canvas);

  //delete closest point
  if (event.altKey) {
    if (predictors.length > 0) {
      let closest_idx = 0;
      let closest_dis = distance_squared(xpos, ypos, predictors[closest_idx][0], predictors[closest_idx][1]);
      for (let i = 1; i < predictors.length; i++) {
        let new_dis = distance_squared(xpos, ypos, predictors[i][0], predictors[i][1]);
        if (new_dis < closest_dis) {
          closest_idx = i;
          closest_dis = new_dis;
        }
      }
      predictors.splice(closest_idx, 1);
      labels.splice(closest_idx, 1);
      train_idc.splice(closest_idx, 1);
    }
  } else { //add point (color based on modification keys pressed)
    predictors.push([xpos, ypos, 1]);
    train_idc.push(1); //making all new points training points for now
    if (event.shiftKey) labels.push([0, 1, 0]);
    else if (event.ctrlKey) labels.push([0, 0, 1]);
    else labels.push([1, 0, 0]);
  }

  draw();
}


function train_network(x, y, lr, reg, W) {
  
  return tf.tidy(() => {
    
    const z1 = tf.matMul(x, W[0]);
    const a1 = tf.relu(z1);
    const z2 = tf.matMul(a1, W[1]);
    const a2 = tf.relu(z2);
    const z3 = tf.matMul(a2, W[2]);
    const probs = tf.softmax(z3, axis=1)
   
    //backproping over neg. log softmax as a single unit - dl/dprobs is (p) for negative labels, and (p-1) for positive labels
    const dprobs = tf.mul(tf.add(probs, tf.neg(y)), 1.0/x.shape[0]);
    const dW3 = tf.mul(-lr, tf.matMul(a2.transpose(), dprobs));
    const dz3 = tf.matMul(dprobs, W[2].transpose());

    const da2 = tf.mul(dz3, tf.step(z2));
    const dW2 = tf.mul(-lr, tf.matMul(a1.transpose(), da2));
    const dz2 = tf.matMul(da2, W[1].transpose());

    const da1 = tf.mul(dz2, tf.step(z1));
    const dW1 = tf.mul(-lr, tf.matMul(x.transpose(), da1));

    return [
              tf.add(W[0], tf.add(dW1, tf.mul(reg, W[0]))), 
              tf.add(W[1], tf.add(dW2, tf.mul(reg, W[1]))),
              tf.add(W[2], tf.add(dW3, tf.mul(reg, W[2]))),
              z3
           ]
  });

}


function evaluate(x, weights) {
  return tf.tidy(() => {
    const a1 = tf.relu(tf.matMul(x, weights[0]));
    const a2 = tf.relu(tf.matMul(a1, weights[1]));
    return tf.matMul(a2, weights[2]);
  });
}

function draw() {
  tf.tidy(() => {
    //console.time('eval');
    const preds = evaluate(normalize(coords), [W1, W2, W3]); //this takes a long time
    //console.timeEnd('eval');
    const classes = tf.argMax(preds, axis=1).arraySync();

    draw_contour(contour_plot, classes, 0, c_red);
    draw_contour(contour_plot, classes, 1, c_green);
    draw_contour(contour_plot, classes, 2, c_blue);

    draw_point(contour_plot, 0, c_red);
    draw_point(contour_plot, 1, c_green);
    draw_point(contour_plot, 2, c_blue);

    const preds_2 = evaluate(normalize(coords), [W1_2, W2_2, W3_2]); //this takes a long time
    const classes_2 = tf.argMax(preds_2, axis=1).arraySync();

    draw_contour(contour_plot2, classes_2, 0, c_red);
    draw_contour(contour_plot2, classes_2, 1, c_green);
    draw_contour(contour_plot2, classes_2, 2, c_blue);

    draw_point(contour_plot2, 0, c_red);
    draw_point(contour_plot2, 1, c_green);
    draw_point(contour_plot2, 2, c_blue);
  });

  let l = train_losses.length
  if (l > 1 && epoch % 10 == 0) {
    if(train_loss_cb.checked) plot_data(loss_plot, train_losses, l-2, l, c_orange, 250, plot_hoffset, plot_voffset);
    if(valid_loss_cb.checked) plot_data(loss_plot, valid_losses, l-2, l, c_violet, 250, plot_hoffset, plot_voffset);
    if(train_acc_cb.checked) plot_data(loss_plot, train_accs, l-2, l, c_magenta, 2, plot_hoffset, plot_voffset);
    if(valid_acc_cb.checked) plot_data(loss_plot, valid_accs, l-2, l, c_cyan, 2, plot_hoffset, plot_voffset);

    if(train_loss_cb_2.checked) plot_data(loss_plot_2, train_losses_2, l-2, l, c_orange, 250, plot_hoffset, plot_voffset);
    if(valid_loss_cb_2.checked) plot_data(loss_plot_2, valid_losses_2, l-2, l, c_violet, 250, plot_hoffset, plot_voffset);
    if(train_acc_cb_2.checked) plot_data(loss_plot_2, train_accs_2, l-2, l, c_magenta, 2, plot_hoffset, plot_voffset);
    if(valid_acc_cb_2.checked) plot_data(loss_plot_2, valid_accs_2, l-2, l, c_cyan, 2, plot_hoffset, plot_voffset);
  }

}


function draw_contour(canvas, classes, hot_index, color) {
  const context = canvas.getContext("2d");
  context.beginPath();
  context.fillStyle = color;
  for (let s = 0; s < (canvas.height/bs)*(canvas.height/bs); s++) {
      if (classes[s] == hot_index) {
        context.rect(coords[s][0], coords[s][1], bs, bs);
      }
  }
  context.fill()
}

function draw_point(canvas, hot_index, color) {
  const context = canvas.getContext("2d");
  context.fillStyle = color;
  context.strokeStyle = c_dark;
  for (let i = 0; i < predictors.length; i++) {
    if (labels[i][hot_index] == 1) {
      context.beginPath();
      if(train_idc[i] == 1) {
        context.arc(predictors[i][0], predictors[i][1], 4, 0, 2 * Math.PI);
      }else{
        context.fillRect(predictors[i][0] - 4, predictors[i][1] - 4, 8, 8);
        context.rect(predictors[i][0] - 4, predictors[i][1] - 4, 8, 8);
      }
      context.fill();
      context.stroke();
    }
  }
}


function update_and_draw() {

  //split data into training and validation sets
  let x = [];
  let y = [];
  let valid_x = [];
  let valid_y = [];
  for (let i = 0; i < predictors.length; i++) {
    if(train_idc[i] == 1) {
      x.push(predictors[i]);
      y.push(labels[i]);
    }else{
      valid_x.push(predictors[i]);
      valid_y.push(labels[i]);
    }
  }

  //train network
  if (x.length > 0) {
    let z_train = 0;
    let z_train_2 = 0;
    [W1, W2, W3, z_train] = train_network(normalize(x), y, lr, wd, [W1, W2, W3]);
    [W1_2, W2_2, W3_2, z_train_2] = train_network(normalize(x), y, lr_2, wd_2, [W1_2, W2_2, W3_2]);
    const probs_train = tf.softmax(z_train, axis=1)
    const probs_train_2 = tf.softmax(z_train_2, axis=1)
    if(epoch % 10 == 0) {
      train_losses.push(tf.mean(tf.mul(tf.neg(tf.log(probs_train)), tf.step(y))).arraySync());
      train_accs.push(tf.sum(tf.equal(tf.argMax(y, axis=1), tf.argMax(z_train, axis=1))).arraySync() / y.length * 100)
      train_losses_2.push(tf.mean(tf.mul(tf.neg(tf.log(probs_train_2)), tf.step(y))).arraySync());
      train_accs_2.push(tf.sum(tf.equal(tf.argMax(y, axis=1), tf.argMax(z_train_2, axis=1))).arraySync() / y.length * 100)
    }
  }else{
    if(epoch % 10 == 0) {
      train_losses.push(0);
      train_accs.push(0);
      train_losses_2.push(0);
      train_accs_2.push(0);
    }
  }

  if (valid_x.length > 0) {
    const z_valid = evaluate(normalize(valid_x), [W1, W2, W3]);
    const probs_valid = tf.softmax(z_valid, axis=1)
    const z_valid_2 = evaluate(normalize(valid_x), [W1_2, W2_2, W3_2]);
    const probs_valid_2 = tf.softmax(z_valid_2, axis=1)
    if(epoch % 10 == 0) {
      valid_losses.push(tf.mean(tf.mul(tf.neg(tf.log(probs_valid)), tf.step(valid_y))).arraySync());
      valid_accs.push(tf.sum(tf.equal(tf.argMax(valid_y, axis=1), tf.argMax(z_valid, axis=1))).arraySync() / valid_y.length * 100)
      valid_losses_2.push(tf.mean(tf.mul(tf.neg(tf.log(probs_valid_2)), tf.step(valid_y))).arraySync());
      valid_accs_2.push(tf.sum(tf.equal(tf.argMax(valid_y, axis=1), tf.argMax(z_valid_2, axis=1))).arraySync() / valid_y.length * 100)
    }
  }else{
    if(epoch % 10 == 0) {
      valid_losses.push(0);
      valid_accs.push(0);
      valid_losses_2.push(0);
      valid_accs_2.push(0);
    }
  }
  epoch += 1;
  draw();
}


function spiral_data(point_total, cw, ch) {
  const point_count = point_total / 2
  const r = Array.from({length: point_count}, (x, i) => i/point_count * (cw * .4)); //making spirals start a little way from the center
  const t0 = Array.from({length: point_count}, (x, i) => i/point_count * 4 + Math.random()*1.0); //~1/3 of circle
  const t1 = Array.from({length: point_count}, (x, i) => i/point_count * 4 + 2.1 + Math.random()*1.0); //~1/3 of circle
  const t2 = Array.from({length: point_count}, (x, i) => i/point_count * 4 + 4.2 + Math.random()*1.0); //~1/3 of circle
  const predictors = [];
  const labels = []
  for (let i = 0; i < point_count; i++) {
    let x = r[i]*Math.cos(t0[i]) + 0.5*cw;
    let y = r[i]*Math.sin(t0[i]) + 0.5*cw;
    predictors.push([x, y, 1]);
    labels.push([1, 0, 0]);

    let x2 = r[i]*Math.cos(t1[i]) + 0.5*cw;
    let y2 = r[i]*Math.sin(t1[i]) + 0.5*cw;
    predictors.push([x2, y2, 1]);
    labels.push([0, 1, 0]);

    let x3 = r[i]*Math.cos(t2[i]) + 0.5*cw;
    let y3 = r[i]*Math.sin(t2[i]) + 0.5*cw;
    predictors.push([x3, y3, 1]);
    labels.push([0, 0, 1]);
  }

  return [predictors, labels];
}


function random_data(points, cw, ch) {
  const predictors = [];
  const labels = []
  for (let i = 0; i < points; i++) {
    let x = Math.random() * cw;
    let y = Math.random() * ch;
    predictors.push([x, y, 1]);
    const n = Math.random();
    if (n < .33) {
      labels.push([1, 0, 0]);
    }else if (n < .66) {
      labels.push([0, 1, 0]);
    }else{
      labels.push([0, 0, 1]);
    }
  }
  return [predictors, labels];
}

function circle_data(points, cw, ch) {
  const predictors = [];
  const labels = []
  for (let i = 0; i < points; i++) {
    let x = Math.random() * cw;
    let y = Math.random() * ch;
    let rs = Math.pow(x-(cw/2), 2) + Math.pow(y-(ch/2), 2);
    if (rs > Math.pow(cw/2 - 15, 2)) {
      labels.push([1, 0, 0]);
      predictors.push([x, y, 1]);
    }else if (rs > Math.pow(cw/2-50, 2)) {
      labels.push([0, 1, 0]);
      predictors.push([x, y, 1]);
    }else{
      labels.push([0, 0, 1]);
      predictors.push([x, y, 1]);
    }
  }
  return [predictors, labels];
}


function gaussian_init(input_layers) {
  return 1.
}
//assume ReLU is used for activation
function kaiming_init(input_layers) {
  return Math.sqrt(2/input_layers);
}
//assumes 0 derivative for activation of 1
function xavier_init(input_layers) {
  return Math.sqrt(1/input_layers);
}

function normalize(tensor) {
  return tf.tidy(() => {
    return tf.sub(tf.div(tensor, 256), 1);
  });
}


function html_set_lr() {
  lr = parseFloat(document.getElementById("lr").value);
}
function html_set_lr2() {
  lr_2 = parseFloat(document.getElementById("lr_2").value);
}

function restart_network() {
  return tf.tidy(() => {
    let w1 = tf.mul(tf.randomNormal([2 + 1, h_layers]), 1.0);
    let w2 = tf.mul(tf.randomNormal([h_layers, h2_layers]), kaiming_init(h_layers));
    let w3 = tf.mul(tf.randomNormal([h2_layers, 3]), kaiming_init(h2_layers));
    return [w1, w2, w3];
  });
}

function html_restart_network() {
  html_set_lr();
  html_set_lr2();
  epoch = 1;
  train_losses = [];
  train_accs = [];
  valid_losses = [];
  valid_accs = [];
  train_losses_2 = [];
  train_accs_2 = [];
  valid_losses_2 = [];
  valid_accs_2 = [];
  html_redraw_plot();
  [W1, W2, W3] = restart_network();
  [W1_2, W2_2, W3_2] = restart_network();
}

function html_redraw_plot() {
  draw_plot(loss_plot, plot_hoffset, plot_voffset, 
            [0, 200, 400, 600, 800, 1000], 
            [["0.00", "0.16", "0.32", "0.48", "0.64", "0.80"], ["0%", "20%", "40%", "60%", "80%", "100%"]]);
  if(train_loss_cb.checked) plot_data(loss_plot, train_losses, 0, train_losses.length, c_orange, 250, plot_hoffset, plot_voffset);
  if(valid_loss_cb.checked) plot_data(loss_plot, valid_losses, 0, valid_losses.length, c_violet, 250, plot_hoffset, plot_voffset);
  if(train_acc_cb.checked) plot_data(loss_plot, train_accs, 0, train_accs.length, c_magenta, 2, plot_hoffset, plot_voffset);
  if(valid_acc_cb.checked) plot_data(loss_plot, valid_accs, 0, valid_accs.length, c_cyan, 2, plot_hoffset, plot_voffset);

  draw_plot(loss_plot_2, plot_hoffset, plot_voffset, 
            [0, 200, 400, 600, 800, 1000], 
            [["0.00", "0.16", "0.32", "0.48", "0.64", "0.80"], ["0%", "20%", "40%", "60%", "80%", "100%"]]);
  if(train_loss_cb_2.checked) plot_data(loss_plot_2, train_losses_2, 0, train_losses_2.length, c_orange, 250, plot_hoffset, plot_voffset);
  if(valid_loss_cb_2.checked) plot_data(loss_plot_2, valid_losses_2, 0, valid_losses_2.length, c_violet, 250, plot_hoffset, plot_voffset);
  if(train_acc_cb_2.checked) plot_data(loss_plot_2, train_accs_2, 0, train_accs_2.length, c_magenta, 2, plot_hoffset, plot_voffset);
  if(valid_acc_cb_2.checked) plot_data(loss_plot_2, valid_accs_2, 0, valid_accs_2.length, c_cyan, 2, plot_hoffset, plot_voffset);
}



function draw_plot(plot, h_offset, v_offset, h_values, v_values) {
  const context = plot.getContext("2d");
  context.clearRect(1, 0, plot.width, plot.height);
  const width = plot.width;
  const height = plot.height;

  //draw axes
  context.beginPath();
  context.strokeStyle = c_dark;
  context.lineWidth = 1;
  context.moveTo(h_offset, 0);
  context.lineTo(h_offset, height - v_offset);
  context.moveTo(h_offset, height - v_offset);
  context.lineTo(width, height - v_offset);
  context.stroke();

  //draw grid lines and labels
  context.beginPath();
  context.strokeStyle = c_dark_alt;
  context.lineWidth = 1;
  context.font = "12px Arial";
  for(let i = 0; i < height; i+=40) {
    context.moveTo(h_offset, height - v_offset -i);
    context.lineTo(width, height- v_offset -i);
    context.fillText(v_values[0][i/40], 0, height - v_offset - i);
    context.fillText(v_values[1][i/40], 35, height - v_offset - i);
  }

  context.fillText("Loss", 0, 10);
  context.fillText("Acc", 35, 10);

  for(let i = 0; i < h_values.length; i++) {
    context.fillText(h_values[i], h_offset + i * 80, height - v_offset + 12); 
    context.moveTo(h_offset + i * 80, height - v_offset);
    context.lineTo(h_offset + i * 80, 0);
  }
  context.fillText("Epochs", width/2, height - 4);
  context.stroke();
}


function plot_data(plot, data, start_idx, end_idx, color, scale, hoffset, voffset) {
    const context = plot.getContext("2d");
    context.beginPath();
    for (let epoch = start_idx; epoch < end_idx - 1; epoch++) {
      context.moveTo(4*(epoch) + hoffset, 255-scale*data[epoch] - voffset);
      context.lineWidth = 2;
      context.lineTo(4*(epoch + 1) + hoffset, 255-scale*data[epoch+1] - voffset);
    }
    context.strokeStyle = color;
    context.stroke();
}

function generate_data(data_type, prob) {
  let x = []
  let y = []
  if (prob < 0) prob = 0
  if (prob > 1) prob = 1
  switch(data_type) {
    case "random_data":
      [x, y] = random_data(8, canvas.width, canvas.height);
      break;
    case "circle_data":
      [x, y] = circle_data(128, canvas.width, canvas.height);
      break;
    case "spiral_data":
      [x, y] = spiral_data(128, canvas.width, canvas.height);
      break;
  }
  const i = split_indices(x.length, prob);

  return [x, y, i];
}

function html_generate_data() {
  const data_type = document.getElementById("data_type").value;
  const prob = document.getElementById("split").value;
  [predictors, labels, train_idc] = generate_data(data_type, prob);
}


function split_indices(l, p) {
  idc = []
  for(let i = 0; i < l; i++) {
    let n = Math.random();
    if (n < p) {
      idc.push(1);
    } else {
      idc.push(0);
    }
  }
  return idc;
}



//making feed forward layers
const h_layers = 12;
const h2_layers = 12;

let predictors = [];
let labels = [];
let train_idc = [];
html_generate_data();

tf.setBackend('cpu');

//init weights
let W1 = tf.mul(tf.randomNormal([2 + 1, h_layers]), 1.0);
let W2 = tf.mul(tf.randomNormal([h_layers, h2_layers]), kaiming_init(h_layers));
let W3 = tf.mul(tf.randomNormal([h2_layers, 3]), kaiming_init(h2_layers));

let W1_2 = tf.mul(tf.randomNormal([2 + 1, h_layers]), 1.0);
let W2_2 = tf.mul(tf.randomNormal([h_layers, h2_layers]), kaiming_init(h_layers));
let W3_2 = tf.mul(tf.randomNormal([h2_layers, 3]), kaiming_init(h2_layers));

let lr = 0.001;
let wd = 0.001;
let lr_2 = 0.001;
let wd_2 = 0.001;
let epoch = 1;
let train_losses = [];
let train_accs = [];
let valid_losses = [];
let valid_accs = [];
let train_losses_2 = [];
let train_accs_2 = [];
let valid_losses_2 = [];
let valid_accs_2 = [];

const contour_plot = document.getElementById("canvas");
contour_plot.addEventListener('mousedown', function(e) {
  handle_click(contour_plot, e);
});
const contour_plot2 = document.getElementById("canvas2");
contour_plot2.addEventListener('mousedown', function(e) {
  handle_click(contour_plot2, e);
});

const bs = 4;

let coords = [];
for (let row = 0; row < contour_plot.height; row += bs) {
  for (let col = 0; col < contour_plot.width; col += bs) {
    coords.push([row, col, 1])
  }
}

const loss_plot = document.getElementById("loss_plot");
const loss_plot_2 = document.getElementById("loss_plot_2");
const train_loss_cb = document.getElementById("train_loss_cb");
const train_acc_cb = document.getElementById("train_acc_cb");
const valid_loss_cb = document.getElementById("valid_loss_cb");
const valid_acc_cb = document.getElementById("valid_acc_cb");
const train_loss_cb_2 = document.getElementById("train_loss_cb_2");
const train_acc_cb_2 = document.getElementById("train_acc_cb_2");
const valid_loss_cb_2 = document.getElementById("valid_loss_cb_2");
const valid_acc_cb_2 = document.getElementById("valid_acc_cb_2");

const plot_hoffset = 70;
const plot_voffset = 30;

const c_light = "white";
const c_light_alt = "lightgray";
const c_dark = "black";
const c_dark_alt = "darkgray";
const c_yellow = "#b58900";
const c_orange = "#cb4b16";
const c_red = "#dc322f";
const c_magenta = "#d33682";
const c_violet = "#6c71c4";
const c_blue = "#268bd2";
const c_cyan = "#2aa198";
const c_green = "#859900";

html_redraw_plot();

const t = setInterval(update_and_draw, 50);
