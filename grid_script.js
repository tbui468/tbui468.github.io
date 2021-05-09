
function distance_squared(x1, y1, x2, y2) {
  let dy = y1 - y2;
  let dx = x1 - x2;
  return dy * dy + dx * dx;
}

function get_cursor_position(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const xpos = event.clientX - rect.left;
  const ypos = event.clientY - rect.top;

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
  } else if (event.shiftKey) {
    predictors.push([xpos, ypos]);
    labels.push([0, 1, 0]);
  } else if (event.ctrlKey) {
    predictors.push([xpos, ypos]);
    labels.push([0, 0, 1]);
  } else {
    predictors.push([xpos, ypos]);
    labels.push([1, 0, 0]);
  }

  draw();
}


function update(x, y, lr, reg) {
  
  [dW1, db1, dW2, db2, dW3, db3] = tf.tidy(() => {
    const sample_count = x.shape[0]
    //forward pass
    const z1 = tf.add(tf.matMul(x, W1), b1);
    const a1 = tf.relu(z1);
    const z2 = tf.add(tf.matMul(a1, W2), b2);
    const a2 = tf.relu(z2);
    const z3 = tf.add(tf.matMul(a2, W3), b3);
    const probs = tf.softmax(z3, axis=1)
    //const loss = tf.sum(tf.mul(tf.neg(tf.log(probs)), tf.step(y)));
    //tf.equal(tf.argMax(y, axis=1), tf.argMax(z2, axis=1)).print()
    //tf.losses.softmaxCrossEntropy(z2, y).print();

    //backproping over neg. log softmax as a single unit - dl/dprobs is (p) for negative labels, and (p-1) for positive labels
    const dprobs = tf.mul(tf.add(probs, tf.neg(y)), 1.0/sample_count);
    const dW3 = tf.mul(-lr, tf.matMul(a2.transpose(), dprobs));
    const db3 = tf.mul(-lr, tf.sum(dprobs, axis=0))
    const dz3 = tf.matMul(dprobs, W3.transpose());

    const da2 = tf.mul(dz3, tf.step(z2));
    const dW2 = tf.mul(-lr, tf.matMul(a1.transpose(), da2));
    const db2 = tf.mul(-lr, tf.sum(da2, axis=0))
    const dz2 = tf.matMul(da2, W2.transpose());

    const da1 = tf.mul(dz2, tf.step(z1));
    const dW1 = tf.mul(-lr, tf.matMul(x.transpose(), da1));
    const db1 = tf.mul(-lr, tf.sum(da1, axis=0))

    return [tf.add(dW1, tf.mul(reg, W1)), db1, tf.add(dW2, tf.mul(reg, W2)), db2, tf.add(dW3, tf.mul(reg, W3)), db3]
  });


  W1 = tf.add(W1, dW1);
  b1 = tf.add(b1, db1);
  W2 = tf.add(W2, dW2);
  b2 = tf.add(b2, db2);
  W3 = tf.add(W3, dW3);
  b3 = tf.add(b3, db3);

}


function evaluate(x, weights, biases) {
  return tf.tidy(() => {
    const z1 = tf.add(tf.matMul(x, weights[0]), biases[0]);
    const a1 = tf.relu(z1);
    const z2 = tf.add(tf.matMul(a1, weights[1]), biases[1]);
    const a2 = tf.relu(z2);
    return tf.add(tf.matMul(a2, weights[2]), biases[2]);
  });

}

function draw() {
  const preds = evaluate(normalize(coords), [W1, W2, W3], [b1, b2, b3]);
  const classes = tf.argMax(preds, axis=1).arraySync();

  /*
  const offset = 0;

  context.beginPath();
  context.fillStyle = "lime";
  for (let s = 0; s < (bh/bs)*(bh/bs); s++) {
      if (preds[s][0] > preds[s][1]) {
        context.rect(coords[s][0] + offset, coords[s][1] + offset, bs, bs);
      }
  }
  context.fill()

  context.beginPath();
  context.fillStyle = "deepskyblue";
  for (let s = 0; s < (bh/bs)*(bh/bs); s++) {
      if (preds[s][0] <= preds[s][1]) {
        context.rect(coords[s][0] + offset, coords[s][1] + offset, bs, bs);
      }
  }
  context.fill()*/

  draw_contour(classes, 0, 'tomato');
  draw_contour(classes, 1, 'lime');
  draw_contour(classes, 2, 'deepskyblue');


  draw_circle(0, 'red');
  draw_circle(1, 'limegreen');
  draw_circle(2, 'dodgerblue');
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
    update(normalize(predictors), labels, 0.1, 0.001);
  }
  draw();
}

//////////////////////SHOULD CLEAN UP CODE BELOW////////////////////
///problem with neural network always being linear???
//not enough datapoints?
//ReLUs are also dying really fast
////////////////prefix global variables with 'g_'

const bw = 512;
const bh = 512;
const bs = 8;

tf.setBackend('cpu');

function spiral_data(point_count) {
  const r = Array.from({length: point_count}, (x, i) => i/point_count * 220);
  const t0 = Array.from({length: point_count}, (x, i) => i/point_count * 4 + Math.random()*0.4); //~1/3 of circle
  const t1 = Array.from({length: point_count}, (x, i) => i/point_count * 4 + 2.1 + Math.random()*0.4); //~1/3 of circle
  const t2 = Array.from({length: point_count}, (x, i) => i/point_count * 4 + 4.2 + Math.random()*0.4); //~1/3 of circle
  const predictors = [];
  const labels = []
  for (let i = 0; i < point_count; i++) {
    let x = r[i]*Math.cos(t0[i]) + 256;
    let y = r[i]*Math.sin(t0[i]) + 256;
    predictors.push([x, y]);
    labels.push([1, 0, 0]);

    let x2 = r[i]*Math.cos(t1[i]) + 256;
    let y2 = r[i]*Math.sin(t1[i]) + 256;
    predictors.push([x2, y2]);
    labels.push([0, 1, 0]);

    let x3 = r[i]*Math.cos(t2[i]) + 256;
    let y3 = r[i]*Math.sin(t2[i]) + 256;
    predictors.push([x3, y3]);
    labels.push([0, 0, 1]);
  }

  return [predictors, labels];
}

const [predictors, labels] = spiral_data(32);


function circle_data() {
  const radius_squared = Math.pow(200, 2);
  const predictors = [];
  const labels = []
  for (let i = 0; i < 64; i++) {
    let x = Math.random() * 512;
    let y = Math.random() * 512;
    predictors.push([x, y]);
    if (Math.pow(x-256, 2) + Math.pow(y-256, 2) < radius_squared) {
      labels.push([1, 0]);
    }else{
      labels.push([0, 1]);
    }
  }
  return [predictors, labels];
}


//setting up counter plot coordinates
let coords = [];
for (let row = 0; row < bh; row += bs) {
  for (let col = 0; col < bw; col += bs) {
    coords.push([row, col])
  }
}

function kaiming_init(input_layers) {
  return Math.sqrt(2/input_layers);
}

function normalize(tensor) {
  return tf.tidy(() => {
    return tf.sub(tf.div(tensor, 256), 1);
  });
}

//making feed forward layers
const h_layers = 8;
const h2_layers = 16;
let W1 = tf.mul(tf.randomNormal([2, h_layers]), 1.0);
let b1 = tf.zeros([1, h_layers]);
let W2 = tf.mul(tf.randomNormal([h_layers, h2_layers]), kaiming_init(h_layers));
let b2 = tf.zeros([1, h2_layers]);
let W3 = tf.mul(tf.randomNormal([h2_layers, 3]), kaiming_init(h2_layers));
let b3 = tf.zeros([1, 3]);

const canvas = document.getElementById("canvas");
canvas.addEventListener('mousedown', function(e) {
  get_cursor_position(canvas, e);
});
const context = canvas.getContext("2d");

const t = setInterval(update_and_draw, 100);
