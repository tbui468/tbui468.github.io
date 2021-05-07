function testing_tensorflow() {
  const a = tf.tensor([[1, 2], [3, 4]]);
  console.log('shape', a.shape);
  a.print();

  let x = tf.fill([1024, 2], 1.1)
  let W1 = tf.fill([2, 8], -1.1);
  let W2 = tf.fill([8, 2], 1.1)
  console.time('tensorflowjs1');
  let z1 = tf.matMul(x, W1);
  let z2 = tf.matMul(z1, W2);
  console.timeEnd('tensorflowjs1');
/*
  tf.setBackend('wasm');
  tf.ready()
    .then(() => {
      let x1 = tf.fill([1000, 100], 1.1)
      let y1 = tf.fill([100, 1000], -1.1);
      console.time('tensorflowjs');
      let z1 = tf.matMul(x1, y1)
      console.timeEnd('tensorflowjs');
    })
    .catch((e) => {
      console.log('yep');
    });*/
/*
  //mathjs
  let x = math.random([1000, 100], -1, 1);
  let y = math.random([100, 1000], -1, 1);
  console.time('mathjs');
  let z = math.multiply(x, y)
  console.timeEnd('mathjs');*/
}

testing_tensorflow()

function testing() {
  let matrixA = math.matrix([[0, 1], [2, 3], [4, 5]]);
  let matrixZ = math.random([2, 2], -1, 1)
  let matrixY = math.matrix([[2, 2], [3, 2]]);
  //console.log(math.multiply(matrixA, matrixZ));
  //console.log(math.multiply(matrixA, matrixY));
  const matrixB = math.matrix([[2, 4], [6, 2]]);
  const matrixC = math.multiply(matrixA, matrixB);
  //console.log(math.column(matrixA, 0));
  //console.log(math.column(matrixA, 1));
  matrixA = math.subset(matrixA, math.index(0, 0), 10);
  //console.log(matrixA.get([0, 0]))

  let W1 = math.random([2, 4], -1, 1);
  let b1 = math.ones([1, 4]);
  let W2 = math.random([4, 2], -1, 1);
  let b2 = math.ones([1, 2]);

  //how to get elements in each of the datatypes
  console.log(math.column(W1, 0).length);
  console.log(math.column(b1, 0).length);
}



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
    if (points.length > 0) {
      let closest_idx = 0;
      let closest_dis = distance_squared(xpos, ypos, points[closest_idx].x, points[closest_idx].y);
      for (let i = 1; i < points.length; i++) {
        let new_dis = distance_squared(xpos, ypos, points[i].x, points[i].y);
        if (new_dis < closest_dis) {
          closest_idx = i;
          closest_dis = new_dis;
        }
      }
      points.splice(closest_idx, 1);
    }
    update();
    return;
  }

  if (event.shiftKey)
    points.push({x: xpos, y: ypos, c: 'b'});
  else
    points.push({x: xpos, y: ypos, c: 'g'});

  update();
}


function draw_circle(x, y, color) {
  context.beginPath();
  context.arc(x, y, 8, 0, 2 * Math.PI);
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = "black";
  context.stroke();
}

function affine(x, W, b) {
  const linear = tf.matMul(x, W);
  /*
  let biases = b;
  for (let i = 0; i < math.column(x, 0).length - 1; i++) {
    biases = math.concat(biases, b, 0); 
  }

  return math.add(linear, biases);*/
  return linear;
}

function relu(z) {
  const zeros = math.zeros(math.size(z));
  const zeros_map = math.number(math.larger(z, zeros));
  return math.dotMultiply(z, zeros_map);
}
/*
function update_weights(points, lr) {
  //forward pass
  let inputs = math.zeros([points.length, 2])
  for (let i = 0; i < points.length; i++) {
    inputs = math.subset(inputs, math.index(i, 0), points[i].x);
    inputs = math.subset(inputs, math.index(i, 1), points[i].y);
  }

  const z1 = affine(inputs, W1, b1);
  //const a1 = relu(z1);
  const z2 = affine(z1, W2, b2);

  //backward pass
  //update weights
}*/

function classify_coords(coords) {
  let W1 = tf.randomNormal([2, 8])
  let b1 = tf.zeros([1, 8]);
  let W2 = tf.randomNormal([8, 2])
  let b2 = tf.zeros([1, 2]);
  const z1 = affine(coords, W1, b1);
  const a1 = tf.relu(z1);
  const z2 = affine(a1, W2, b2);
  return z2;
}


function drawContours(){
  const preds = classify_coords(coords).arraySync();

  console.log('hi')

  context.beginPath();
  for (let x = 0; x < 32; x += 1) {
    for (let y = 0; y < 32; y += 1) {
      if (preds[y, 0] > preds[y, 1])
        context.rect(x*10, y*10, 10, 10);
    }
  }
  context.fillStyle = "lime";
  context.fill()

  context.beginPath();
  for (let x = 0; x < 32; x += 1) {
    for (let y = 0; y < 32; y += 1) {
      if (preds[y, 0] <= preds[y, 1])
        context.rect(x*10, y*10, 10, 10);
    }
  }
  context.fillStyle = "deepskyblue";
  context.fill()

}

function update() {
  drawContours();
  for (let i = 0; i < points.length; i++) {
    if (points[i].c == 'b') 
      draw_circle(points[i].x, points[i].y, 'dodgerblue');
  }
  for (let i = 0; i < points.length; i++) {
    if (points[i].c == 'g')
      draw_circle(points[i].x, points[i].y, 'limegreen');
  }
}


const bw = 400;
const bh = 400;
const points = [{x: 10, y: 20, c: 'g'}, {x: 23, y: 89, c: 'g'}, {x: 43.2, y: 200.3, c: 'b'}]
let arr = []
for (let row = 0; row < 32; row += 1) {
  for (let col = 0; col < 32; col += 1) {
    arr.push(row);
    arr.push(col);
  }
}
const coords = tf.tensor2d(arr, [1024, 2]);
coords.print();
//using math.matrix causes wierd type problems
const canvas = document.getElementById("canvas");
canvas.addEventListener('mousedown', function(e) {
  get_cursor_position(canvas, e);
});
const context = canvas.getContext("2d");
const box_size = 4;

let t = setInterval(update, 1000);
