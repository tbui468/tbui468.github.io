
function distance_squared(x1, y1, x2, y2) {
  let dy = y1 - y2;
  let dx = x1 - x2;
  return dy * dy + dx * dx;
}

function get_cursor_position(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const xpos = event.clientX - rect.left;
  const ypos = event.clientY - rect.top;

  if (event.ctrlKey) {
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
    labels.push([0, 1]);
  } else {
    predictors.push([xpos, ypos]);
    labels.push([1, 0]);
  }

  draw();
}


function update(x, y, lr) {
  
  [dW1, db1, dW2, db2] = tf.tidy(() => {
    const sample_count = x.length;
    //forward pass
    let n_x = tf.sub(tf.div(x, 256.), 1.0);
    const z1 = tf.add(tf.matMul(n_x, W1), b1);
    const a1 = tf.relu(z1);
    const z2 = tf.add(tf.matMul(a1, W2), b2);
    const probs = tf.softmax(z2, axis=1)
    const loss = tf.sum(tf.mul(tf.neg(tf.log(probs)), tf.step(y)));
    //tf.equal(tf.argMax(y, axis=1), tf.argMax(z2, axis=1)).print()
    //tf.losses.softmaxCrossEntropy(z2, y).print();

    //backproping over neg. log softmax as a single unit - dl/dprobs is (p) for negative labels, and (p-1) for positive labels
    const dprobs = tf.mul(tf.add(probs, tf.neg(y)), 1.0/sample_count);
    const dW2 = tf.mul(-lr, tf.matMul(a1.transpose(), dprobs));
    const db2 = tf.mul(-lr, tf.mean(dprobs, axis=0))
    const dz2 = tf.matMul(dprobs, W2.transpose());

    //const sig = tf.sigmoid(z1)
    //const dsig = tf.mul(tf.sub(1, sig), sig)
    //const da1 = tf.mul(dz2, dsig);
    const da1 = tf.mul(dz2, tf.step(z1));
    const dW1 = tf.mul(-lr, tf.matMul(n_x.transpose(), da1));
    const db1 = tf.mul(-lr, tf.mean(da1, axis=0))

    return [dW1, db1, dW2, db2]
  });


  W1 = tf.add(W1, dW1);
  b1 = tf.add(b1, db1);
  W2 = tf.add(W2, dW2);
  b2 = tf.add(b2, db2);
/*
  //numerically compute gradient to see what problem is
  [W1, b1, W2, b2] = tf.tidy(() => {
    //W2 is 8x2, b2 is 1x2
    let h = 0.0001;
    const f = tf.losses.softmaxCrossEntropy(y, evaluate(x, [W1, W2], [b1, b2])).arraySync();
    console.log("loss: ", f);
    //W2 and b2
    let W2_arr = W2.arraySync();
    let W2_check = tf.zeros([h_layers, 2]).arraySync();
    for (let row = 0; row < h_layers; row++) {
      for(let col = 0; col < 2; col++) {
        let old_w = W2_arr[row][col];
        W2_arr[row][col] = old_w + h;
        let fh = tf.losses.softmaxCrossEntropy(y, evaluate(x, [W1, W2_arr], [b1, b2])).arraySync();
        W2_arr[row][col] = old_w;
        W2_check[row][col] = (fh - f) / h;
      }
    }

    let b2_arr = b2.arraySync();
    let b2_check = tf.zeros([1, 2]).arraySync();
    for (let row = 0; row < 1; row++) {
      for(let col = 0; col < 2; col++) {
        let old_w = b2_arr[row][col];
        b2_arr[row][col] = old_w + h;
        let fh = tf.losses.softmaxCrossEntropy(y, evaluate(x, [W1, W2], [b1, b2_arr])).arraySync();
        b2_arr[row][col] = old_w;
        b2_check[row][col] = (fh - f) / h;
      }
    }

    //W1 and b1
    let W1_arr = W1.arraySync();
    let W1_check = tf.zeros([2, h_layers]).arraySync();
    for (let row = 0; row < 2; row++) {
      for(let col = 0; col < h_layers; col++) {
        let old_w = W1_arr[row][col];
        W1_arr[row][col] = old_w + h;
        let fh = tf.losses.softmaxCrossEntropy(y, evaluate(x, [W1_arr, W2], [b1, b2])).arraySync();
        W1_arr[row][col] = old_w;
        W1_check[row][col] = (fh - f) / h;
      }
    }

    let b1_arr = b1.arraySync();
    let b1_check = tf.zeros([1, h_layers]).arraySync();
    for (let row = 0; row < 1; row++) {
      for(let col = 0; col < h_layers; col++) {
        let old_w = b1_arr[row][col];
        b1_arr[row][col] = old_w + h;
        let fh = tf.losses.softmaxCrossEntropy(y, evaluate(x, [W1, W2], [b1_arr, b2])).arraySync();
        b1_arr[row][col] = old_w;
        b1_check[row][col] = (fh - f) / h;
      }
    }

    console.log(W1_check)
    console.log(W2_check);

    W1 = tf.add(W1, tf.mul(tf.tensor(W1_check), -lr));
    b1 = tf.add(b1, tf.mul(tf.tensor(b1_check), -lr));
    W2 = tf.add(W2, tf.mul(tf.tensor(W2_check), -lr));
    b2 = tf.add(b2, tf.mul(tf.tensor(b2_check), -lr));

    return [W1, b1, W2, b2];

  });*/



  //tf.equal(tf.argMax(y_arr, axis=1), tf.argMax(evaluate(x, [W1, W2], [b1, b2]), axis=1)).print()

}


function evaluate(x, weights, biases) {
  return tf.tidy(() => {
    let n_x = tf.sub(tf.div(x, 256.), 1.0);
    const z1 = tf.add(tf.matMul(n_x, weights[0]), biases[0]);
    const a1 = tf.relu(z1);
    return tf.add(tf.matMul(a1, weights[1]), biases[1]);
  });

}

function draw() {
  const preds = evaluate(coords, [W1, W2], [b1, b2]).arraySync();

  const offset = 0;

  context.beginPath();
  context.fillStyle = "lime";
  for (let s = 0; s < (bh/bs)*(bh/bs); s++) {
      if (preds[s][0] > preds[s][1]) {
        context.rect(coords_array[s][0] + offset, coords_array[s][1] + offset, bs, bs);
      }
  }
  context.fill()

  context.beginPath();
  context.fillStyle = "deepskyblue";
  for (let s = 0; s < (bh/bs)*(bh/bs); s++) {
      if (preds[s][0] <= preds[s][1]) {
        context.rect(coords_array[s][0] + offset, coords_array[s][1] + offset, bs, bs);
      }
  }
  context.fill()


  //draw blue circles
  context.fillStyle = 'dodgerblue'
  context.strokeStyle = "black";
  for (let i = 0; i < predictors.length; i++) {
    if (labels[i][1] == 1) {
      context.beginPath();
      context.arc(predictors[i][0], predictors[i][1], 4, 0, 2 * Math.PI);
      context.fill();
      context.stroke();
    }
  }

  //draw green circles
  context.fillStyle = 'limegreen'
  context.strokeStyle = "black";
  for (let i = 0; i < predictors.length; i++) {
    if (labels[i][0] == 1) {
      context.beginPath();
      context.arc(predictors[i][0], predictors[i][1], 4, 0, 2 * Math.PI);
      context.fill();
      context.stroke();
    }
  }
}

function update_and_draw() {
  for(let i = 0; i < 1; i++) {
    update(predictors, labels, 1.0);
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
const bs = 16;

const predictors = [
                    [240, 240], [240, 270], [270, 240], [270, 270],
                    [56, 56], [56, 456], [456, 56], [456, 456]
                   ]
//[green, blue]
const labels = [
                [1, 0], [1, 0], [1, 0], [1, 0],
                [0, 1], [0, 1], [0, 1], [0, 1]
               ];


let arr = [];
for (let row = 0; row < bh; row += bs) {
  for (let col = 0; col < bw; col += bs) {
    arr.push([row, col])
  }
}

tf.setBackend('cpu');
const coords = tf.tensor2d(arr, [(bh/bs)*(bh/bs), 2]);
const coords_array = coords.arraySync();
const h_layers = 16;
let W1 = tf.mul(tf.randomNormal([2, h_layers]), 0.01);
let b1 = tf.zeros([1, h_layers]);
let W2 = tf.mul(tf.randomNormal([h_layers, 2]), 0.01);
let b2 = tf.zeros([1, 2]);
const canvas = document.getElementById("canvas");
canvas.addEventListener('mousedown', function(e) {
  get_cursor_position(canvas, e);
});
const context = canvas.getContext("2d");

//update_and_draw();
let t = setInterval(update_and_draw, 200);
