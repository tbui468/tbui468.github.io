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

//testing_tensorflow()

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
  context.arc(x, y, 4, 0, 2 * Math.PI);
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = "black";
  context.stroke();
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

  //temp jus to test changing weights
  W1 = tf.add(W1, tf.randomNormal(W1.shape, stdDev=0.0001));
  W2 = tf.add(W2, tf.randomNormal(W2.shape, stdDev=0.0001));

  const z1 = tf.add(tf.matMul(coords, W1), b1);
  const a1 = tf.relu(z1);
  const z2 = tf.add(tf.matMul(a1, W2), b2);
  return z2;
}


function drawContours(){
  const preds = classify_coords(coords).arraySync();
  const c = coords.arraySync();


  context.beginPath();
  for (let s = 0; s < (bh/bs)*(bh/bs); s++) {
      if (preds[s][0] > preds[s][1]) 
        context.rect(c[s][0] + 256, c[s][1] + 256, 8, 8);
  }
  context.fillStyle = "lime";
  context.fill()

  context.beginPath();
  for (let s = 0; s < (bh/bs)*(bh/bs); s++) {
      if (preds[s][0] <= preds[s][1]) 
        context.rect(c[s][0] + 256, c[s][1] + 256, 8, 8);
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


const bw = 512;
const bh = 512;
const bs = 4;
const points = [{x: 10, y: 20, c: 'g'}, {x: 23, y: 89, c: 'g'}, {x: 43.2, y: 200.3, c: 'b'}]
let arr = []
for (let row = 0; row < bh / bs; row += 1) {
  for (let col = 0; col < bw / bs; col += 1) {
    arr.push(row*bs - 256);
    arr.push(col*bs - 256);
  }
}
const coords = tf.tensor2d(arr, [(bh/bs)*(bh/bs), 2]);
coords.print()
let W1 = tf.randomNormal([2, 8])
let b1 = tf.zeros([1, 8]);
let W2 = tf.randomNormal([8, 2])
let b2 = tf.zeros([1, 2]);
//using math.matrix causes wierd type problems
const canvas = document.getElementById("canvas");
canvas.addEventListener('mousedown', function(e) {
  get_cursor_position(canvas, e);
});
const context = canvas.getContext("2d");

let t = setInterval(update, 100);
