//add a choose data button (set number of points to a fixed number 64 or so)
//add a training loss graph that updates with updates (epochs vs loss)
//graph gradients in each layer (use colors to show different layers - 3 different gradients layers)
//what else is interesting to observe? Affine transformations, and non-linear activations on those affine transformations in higher dimensional space
//  either of one layer or all layers

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
    }
  } else { //add point (color based on modification keys pressed)
    predictors.push([xpos, ypos, 1]);
    if (event.shiftKey) labels.push([0, 1, 0]);
    else if (event.ctrlKey) labels.push([0, 0, 1]);
    else labels.push([1, 0, 0]);
  }

  draw();
}


function update(x, y, lr, reg) {
  
  [W1, W2, W3] = tf.tidy(() => {
    
    const z1 = tf.matMul(x, W1);
    const a1 = tf.relu(z1);
    const z2 = tf.matMul(a1, W2);
    const a2 = tf.relu(z2);
    const z3 = tf.matMul(a2, W3);
    const probs = tf.softmax(z3, axis=1)

    //const loss = tf.sum(tf.mul(tf.neg(tf.log(probs)), tf.step(y)));
    //tf.equal(tf.argMax(y, axis=1), tf.argMax(z2, axis=1)).print()
    //tf.losses.softmaxCrossEntropy(z2, y).print();

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
              tf.add(W3, tf.add(dW3, tf.mul(reg, W3)))
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

    draw_contour(classes, 0, 'tomato');
    draw_contour(classes, 1, 'lime');
    draw_contour(classes, 2, 'deepskyblue');

    draw_circle(0, 'red');
    draw_circle(1, 'limegreen');
    draw_circle(2, 'dodgerblue');
  });
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
  context.strokeStyle = "black";
  for (let i = 0; i < predictors.length; i++) {
    if (labels[i][hot_index] == 1) {
      context.beginPath();
      context.arc(predictors[i][0], predictors[i][1], 8, 0, 2 * Math.PI);
      context.fill();
      context.stroke();
    }
  }
}

function update_and_draw() {
  for(let i = 0; i < 1; i++) {
    update(normalize(predictors), labels, lr, wd);
  }
  draw();
}

const bw = 512;
const bh = 512;
const bs = 8;

tf.setBackend('cpu');

function spiral_data(point_total) {
  const point_count = point_total / 2
  const r = Array.from({length: point_count}, (x, i) => i/point_count * 210 + 10); //making spirals start a little way from the center
  const t0 = Array.from({length: point_count}, (x, i) => i/point_count * 4 + Math.random()*0.5); //~1/3 of circle
  const t1 = Array.from({length: point_count}, (x, i) => i/point_count * 4 + 2.1 + Math.random()*0.5); //~1/3 of circle
  const t2 = Array.from({length: point_count}, (x, i) => i/point_count * 4 + 4.2 + Math.random()*0.5); //~1/3 of circle
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

const [predictors, labels] = spiral_data(128);

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

//setting up counter plot coordinates
let coords = [];
for (let row = 0; row < bh; row += bs) {
  for (let col = 0; col < bw; col += bs) {
    coords.push([row, col, 1])
  }
}

//making feed forward layers
const h_layers = 12;
const h2_layers = 12;

function reset_weights() {
  lr = parseFloat(document.getElementById("lr").value);
  wd = parseFloat(document.getElementById("wd").value);
  w_init_name = document.getElementById("w_init").value;
  w_init_fn = gaussian_init;
  switch(w_init_name) {
    case "gaussian":
      w_init_fn = gaussian_init;
      break;
    case "xavier":
      w_init_fn = xavier_init;
      break;
    case "kaiming":
      w_init_fn = kaiming_init;
      break;
  }

  [W1, W2, W3] = tf.tidy(() => {
    let w1 = tf.mul(tf.randomNormal([2 + 1, h_layers]), 1.0);
    let w2 = tf.mul(tf.randomNormal([h_layers, h2_layers]), w_init_fn(h_layers));
    let w3 = tf.mul(tf.randomNormal([h2_layers, 3]), w_init_fn(h2_layers));
    return [w1, w2, w3];
  });

}

//init weights
let W1 = tf.mul(tf.randomNormal([2 + 1, h_layers]), 1.0);
let W2 = tf.mul(tf.randomNormal([h_layers, h2_layers]), kaiming_init(h_layers));
let W3 = tf.mul(tf.randomNormal([h2_layers, 3]), kaiming_init(h2_layers));

let lr = 0.001;
let wd = 0.001;

const canvas = document.getElementById("canvas");
canvas.addEventListener('mousedown', function(e) {
  handle_click(canvas, e);
});
const context = canvas.getContext("2d");

const t = setInterval(update_and_draw, 50);
