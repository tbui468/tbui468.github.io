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


function train(x, y, lr, reg) {
  
  [W1, W2, W3, z] = tf.tidy(() => {
    
    const z1 = tf.matMul(x, W1);
    const a1 = tf.relu(z1);
    const z2 = tf.matMul(a1, W2);
    const a2 = tf.relu(z2);
    const z3 = tf.matMul(a2, W3);
    const probs = tf.softmax(z3, axis=1)
   
    //backproping over neg. log softmax as a single unit - dl/dprobs is (p) for negative labels, and (p-1) for positive labels
    const dprobs = tf.mul(tf.add(probs, tf.neg(y)), 1.0/x.shape[0]);
    const dW3 = tf.mul(-lr, tf.matMul(a2.transpose(), dprobs));
    const dz3 = tf.matMul(dprobs, W3.transpose());

    const da2 = tf.mul(dz3, tf.step(z2));
    const dW2 = tf.mul(-lr, tf.matMul(a1.transpose(), da2));
    const dz2 = tf.matMul(da2, W2.transpose());

    const da1 = tf.mul(dz2, tf.step(z1));
    const dW1 = tf.mul(-lr, tf.matMul(x.transpose(), da1));

    return [
              tf.add(W1, tf.add(dW1, tf.mul(reg, W1))), 
              tf.add(W2, tf.add(dW2, tf.mul(reg, W2))),
              tf.add(W3, tf.add(dW3, tf.mul(reg, W3))),
              z3
           ]
  });

  return z;

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

    draw_contour(classes, 0, c_red);
    draw_contour(classes, 1, c_green);
    draw_contour(classes, 2, c_blue);

    draw_circle(0, c_red);
    draw_circle(1, c_green);
    draw_circle(2, c_blue);
  });

  //drawing loss plot (need to only draw once)
  let l = train_losses.length
  if (l > 1 && epoch % 10 == 0) {
    if(train_loss_cb.checked) plot_data(train_losses, l-2, l, c_orange, 500, plot_hoffset, plot_voffset);
    if(train_acc_cb.checked) plot_data(train_accs, l-2, l, c_magenta, 2, plot_hoffset, plot_voffset);
    if(valid_loss_cb.checked) plot_data(valid_losses, l-2, l, c_violet, 500, plot_hoffset, plot_voffset);
    if(valid_acc_cb.checked) plot_data(valid_accs, l-2, l, c_cyan, 2, plot_hoffset, plot_voffset);
  }

}


function redraw_plot() {
  clear_plot();
  if(train_loss_cb.checked) plot_data(train_losses, 0, train_losses.length, c_orange, 500, plot_hoffset, plot_voffset)
  if(train_acc_cb.checked) plot_data(train_accs, 0, train_accs.length, c_magenta, 2, plot_hoffset, plot_voffset)
  if(valid_loss_cb.checked) plot_data(valid_losses, 0, valid_losses.length, c_violet, 500, plot_hoffset, plot_voffset)
  if(valid_acc_cb.checked) plot_data(valid_accs, 0, valid_accs.length, c_cyan, 2, plot_hoffset, plot_voffset)
}


function draw_contour(classes, hot_index, color) {
  context.beginPath();
  context.fillStyle = color;
  for (let s = 0; s < (bh/bs)*(bh/bs); s++) {
      if (classes[s] == hot_index) {
        context.rect(coords[s][0], coords[s][1], bs, bs);
      }
  }
  context.fill()
}

function draw_circle(hot_index, color) {
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

  if (x.length > 0) {
    const z_train = train(normalize(x), y, lr, wd);
    const probs_train = tf.softmax(z_train, axis=1)
    if(epoch % 10 == 0) {
      train_losses.push(tf.mean(tf.mul(tf.neg(tf.log(probs_train)), tf.step(y))).arraySync());
      train_accs.push(tf.sum(tf.equal(tf.argMax(y, axis=1), tf.argMax(z_train, axis=1))).arraySync() / y.length * 100)
    }
  }else{
    if(epoch % 10 == 0) {
      train_losses.push(0);
      train_accs.push(0);
    }
  }

  if (valid_x.length > 0) {
    const z_valid = evaluate(normalize(valid_x), [W1, W2, W3]);
    const probs_valid = tf.softmax(z_valid, axis=1)
    if(epoch % 10 == 0) {
      valid_losses.push(tf.mean(tf.mul(tf.neg(tf.log(probs_valid)), tf.step(valid_y))).arraySync());
      valid_accs.push(tf.sum(tf.equal(tf.argMax(valid_y, axis=1), tf.argMax(z_valid, axis=1))).arraySync() / valid_y.length * 100)
    }
  }else{
    if(epoch % 10 == 0) {
      valid_losses.push(0);
      valid_accs.push(0);
    }
  }
  epoch += 1;
  draw();
}


function spiral_data(point_total) {
  const point_count = point_total / 2
  const r = Array.from({length: point_count}, (x, i) => i/point_count * 210 + 10); //making spirals start a little way from the center
  const t0 = Array.from({length: point_count}, (x, i) => i/point_count * 4 + Math.random()*1.0); //~1/3 of circle
  const t1 = Array.from({length: point_count}, (x, i) => i/point_count * 4 + 2.1 + Math.random()*1.0); //~1/3 of circle
  const t2 = Array.from({length: point_count}, (x, i) => i/point_count * 4 + 4.2 + Math.random()*1.0); //~1/3 of circle
  const predictors = [];
  const labels = []
  for (let i = 0; i < point_count; i++) {
    let x = r[i]*Math.cos(t0[i]) + 256;
    let y = r[i]*Math.sin(t0[i]) + 256;
    predictors.push([x, y, 1]);
    labels.push([1, 0, 0]);

    let x2 = r[i]*Math.cos(t1[i]) + 256;
    let y2 = r[i]*Math.sin(t1[i]) + 256;
    predictors.push([x2, y2, 1]);
    labels.push([0, 1, 0]);

    let x3 = r[i]*Math.cos(t2[i]) + 256;
    let y3 = r[i]*Math.sin(t2[i]) + 256;
    predictors.push([x3, y3, 1]);
    labels.push([0, 0, 1]);
  }

  return [predictors, labels];
}

function basic_data() {
  const predictors = [];
  const labels = [];

  predictors.push([256, 200, 1]);
  labels.push([1, 0, 0]);
  predictors.push([200, 300, 1]);
  labels.push([0, 1, 0]);
  predictors.push([300, 300, 1]);
  labels.push([0, 0, 1]);
  return [predictors, labels];
}

function random_data(points) {
  const predictors = [];
  const labels = []
  for (let i = 0; i < points; i++) {
    let x = Math.random() * 512;
    let y = Math.random() * 512;
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

function circle_data(points) {
  const predictors = [];
  const labels = []
  for (let i = 0; i < points; i++) {
    let x = Math.random() * 512;
    let y = Math.random() * 512;
    let rs = Math.pow(x-256, 2) + Math.pow(y-256, 2);
    if (rs > Math.pow(240, 2)) {
      labels.push([1, 0, 0]);
      predictors.push([x, y, 1]);
    }else if (rs > Math.pow(150, 2) && rs < Math.pow(210, 2)) {
      labels.push([0, 1, 0]);
      predictors.push([x, y, 1]);
    }else if(rs < Math.pow(120, 2)){
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

function restart_network(lr) {
  return tf.tidy(() => {
    let w1 = tf.mul(tf.randomNormal([2 + 1, h_layers]), 1.0);
    let w2 = tf.mul(tf.randomNormal([h_layers, h2_layers]), kaiming_init(h_layers));
    let w3 = tf.mul(tf.randomNormal([h2_layers, 3]), kaiming_init(h2_layers));
    return [w1, w2, w3];
  });
}

function html_restart_network() {
  let lr = parseFloat(document.getElementById("lr").value);
  reset_plot();
  [W1, W2, W3] = restart_network(lr);
}


function clear_plot() {
  loss_context.clearRect(1, 0, loss_canvas.width, loss_canvas.height-1);
  draw_axis(loss_canvas, plot_hoffset, plot_voffset);
}

function reset_plot() {
  clear_plot();
  epoch = 1;
  train_losses = [];
  train_accs = [];
  valid_losses = [];
  valid_accs = [];
}

function plot_data(data, start_idx, end_idx, color, scale, hoffset, voffset) {
    loss_context.beginPath();
    for (let epoch = start_idx; epoch < end_idx - 1; epoch++) {
      loss_context.moveTo(10*(epoch)/2 + hoffset, 255-scale*data[epoch] - voffset);
      loss_context.lineWidth = 1;
      loss_context.lineTo(10*(epoch + 1)/2 + hoffset, 255-scale*data[epoch+1] - voffset);
    }
    loss_context.strokeStyle = color;
    loss_context.stroke();
}

function generate_data(data_type, prob) {
  let x = []
  let y = []
  if (prob < 0) prob = 0
  if (prob > 1) prob = 1
  switch(data_type) {
    case "basic_data":
      [x, y] = basic_data();
      break;
    case "random_data":
      [x, y] = random_data(32);
      break;
    case "circle_data":
      [x, y] = circle_data(128);
      break;
    case "spiral_data":
      [x, y] = spiral_data(128);
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


function draw_axis(canvas, hoffset, voffset) {
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  //draw axes
  context.beginPath();
  context.strokeStyle = c_dark;
  context.lineWidth = 1;
  context.moveTo(hoffset, 0);
  context.lineTo(hoffset, height - voffset);
  context.moveTo(hoffset, height - voffset);
  context.lineTo(width, height - voffset);
  context.stroke();

  //draw grid lines
  context.beginPath();
  context.strokeStyle = c_dark_alt;
  context.lineWidth = 1;
  for(let i = 0; i < height; i+=40) {
    context.moveTo(hoffset, height - voffset -i);
    context.lineTo(width, height- voffset -i);
    context.fillText((i/40 * 20) + "%", 0, height - voffset - i);
  }
  context.stroke();
}

const bw = 512;
const bh = 512;
const bs = 8;

//setting up contour plot coordinates
let coords = [];
for (let row = 0; row < bh; row += bs) {
  for (let col = 0; col < bw; col += bs) {
    coords.push([row, col, 1])
  }
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

let lr = 0.001;
let wd = 0.001;
let epoch = 1;
let train_losses = [];
let train_accs = [];
let valid_losses = [];
let valid_accs = [];

const canvas = document.getElementById("canvas");
canvas.addEventListener('mousedown', function(e) {
  handle_click(canvas, e);
});
const context = canvas.getContext("2d");

const loss_canvas = document.getElementById("loss_canvas");
const train_loss_cb = document.getElementById("train_loss_cb");
const train_acc_cb = document.getElementById("train_acc_cb");
const loss_context = loss_canvas.getContext("2d");

const plot_hoffset = 30;
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


clear_plot();

const t = setInterval(update_and_draw, 50);
