var statusElement = document.getElementById('status');
var progressElement = document.getElementById('progress');
var spinnerElement = document.getElementById('spinner');

var Module = {
print: (function() {
  var element = document.getElementById('output');
  if (element) element.value = ''; // clear browser cache
  return (...args) => {
    var text = args.join(' ');
    // These replacements are necessary if you render to raw HTML
    //text = text.replace(/&/g, "&amp;");
    //text = text.replace(/</g, "&lt;");
    //text = text.replace(/>/g, "&gt;");
    //text = text.replace('\n', '<br>', 'g');
    console.log(text);
    if (element) {
      element.value += text + "\n";
      element.scrollTop = element.scrollHeight; // focus on bottom
    }
  };
})(),
canvas: (() => {
  var canvas = document.getElementById('canvas');

  // As a default initial behavior, pop up an alert when webgl context is lost. To make your
  // application robust, you may want to override this behavior before shipping!
  // See http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.15.2
  canvas.addEventListener("webglcontextlost", (e) => { alert('WebGL context lost. You will need to reload the page.'); e.preventDefault(); }, false);

  return canvas;
})(),
setStatus: (text) => {
  Module.setStatus.last ??= { time: Date.now(), text: '' };
  if (text === Module.setStatus.last.text) return;
  var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
  var now = Date.now();
  if (m && now - Module.setStatus.last.time < 30) return; // if this is a progress update, skip it if too soon
  Module.setStatus.last.time = now;
  Module.setStatus.last.text = text;
  if (m) {
    text = m[1];
    progressElement.value = parseInt(m[2])*100;
    progressElement.max = parseInt(m[4])*100;
    progressElement.hidden = false;
    spinnerElement.hidden = false;
  } else {
    progressElement.value = null;
    progressElement.max = null;
    progressElement.hidden = true;
    if (!text) spinnerElement.style.display = 'none';
  }
  statusElement.innerHTML = text;
},
totalDependencies: 0,
monitorRunDependencies: (left) => {
  this.totalDependencies = Math.max(this.totalDependencies, left);
  Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
}
};
Module.setStatus('Downloading...');
window.onerror = (event) => {
// TODO: do not warn on ok events like simulating an infinite loop or exitStatus
Module.setStatus('Exception thrown, see JavaScript console');
spinnerElement.style.display = 'none';
Module.setStatus = (text) => {
  if (text) console.error('[post-exception status] ' + text);
};
};

const modules = [
    { 
        name: 
            "Not",
        builtin_code:
            `module Not(in) -> out { 
                Nand(in, in) -> out
            }`,
        test_cases: 
            [{inputs: [0], outputs: [1]}, 
             {inputs: [1], outputs: [0]}],
        identifiers:
            ["in", "out"],
        default_code: 
            "module Not(in) -> out { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "And",
        builtin_code:
            `module And(a, b) -> out { 
                Nand(a, b) -> temp
                Not(temp) -> out
            }`,
        test_cases: 
            [{inputs: [0, 0], outputs: [0]}, 
             {inputs: [0, 1], outputs: [0]},
             {inputs: [1, 0], outputs: [0]},
             {inputs: [1, 1], outputs: [1]}],
        identifiers:
            ["a", "b", "out"],
        default_code: 
            "module And(a, b) -> out { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "Or",
        builtin_code:
            `module Or(a, b) -> out { 
                Not(a) -> t1
                Not(b) -> t2
                And(t1, t2) -> t3
                Not(t3) -> out
            }`,
        test_cases: 
            [{inputs: [0, 0], outputs: [0]}, 
             {inputs: [0, 1], outputs: [1]},
             {inputs: [1, 0], outputs: [1]},
             {inputs: [1, 1], outputs: [1]}],
        identifiers:
            ["a", "b", "out"],
        default_code: 
            "module Or(a, b) -> out { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "Nor",
        builtin_code:
            `module Nor(a, b) -> out { 
                Or(a, b) -> t
                Not(t) -> out
            }`,
        test_cases: 
            [{inputs: [0, 0], outputs: [1]}, 
             {inputs: [0, 1], outputs: [0]},
             {inputs: [1, 0], outputs: [0]},
             {inputs: [1, 1], outputs: [0]}],
        identifiers:
            ["a", "b", "out"],
        default_code: 
            "module Nor(a, b) -> out { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "Xor",
        builtin_code:
            `module Xor(a, b) -> out {
                Not(a) -> na
                Not(b) -> nb
                And(na, b) -> a1
                And(a, nb) -> a2
                Or(a1, a2) -> out
            }`,
        test_cases: 
            [{inputs: [0, 0], outputs: [0]}, 
             {inputs: [0, 1], outputs: [1]},
             {inputs: [1, 0], outputs: [1]},
             {inputs: [1, 1], outputs: [0]}],
        identifiers:
            ["a", "b", "out"],
        default_code: 
            "module Xor(a, b) -> out { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "Xnor",
        builtin_code:
            `module Xnor(a, b) -> out {
                Xor(a, b) -> t
                Not(t) -> out
            }`,
        test_cases: 
            [{inputs: [0, 0], outputs: [1]}, 
             {inputs: [0, 1], outputs: [0]},
             {inputs: [1, 0], outputs: [0]},
             {inputs: [1, 1], outputs: [1]}],
        identifiers:
            ["a", "b", "out"],
        default_code: 
            "module Xnor(a, b) -> out { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "Mux",
        builtin_code:
            `module Mux(a, b, sel) -> out {
                Not(sel) -> notSel
                And(b, sel) -> and1
                And(a, notSel) -> and2
                Or(and1, and2) -> out
            }`,
        test_cases: 
            [{inputs: [0, 0, 0], outputs: [0]}, 
             {inputs: [0, 1, 0], outputs: [0]},
             {inputs: [1, 0, 0], outputs: [1]},
             {inputs: [1, 1, 0], outputs: [1]},
             {inputs: [0, 0, 1], outputs: [0]}, 
             {inputs: [0, 1, 1], outputs: [1]},
             {inputs: [1, 0, 1], outputs: [0]},
             {inputs: [1, 1, 1], outputs: [1]}],
        identifiers:
            ["a", "b", "sel", "out"],
        default_code: 
            "module Mux(a, b, sel) -> out { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "DMux",
        builtin_code:
            `module DMux(in, sel) -> a, b {
                Not(sel) -> notSel
                And(in, notSel) -> a
                And(in, sel) -> b
            }`,
        test_cases: 
            [{inputs: [0, 0], outputs: [0, 0]}, 
             {inputs: [1, 0], outputs: [1, 0]},
             {inputs: [0, 1], outputs: [0, 0]},
             {inputs: [1, 1], outputs: [0, 1]}],
        identifiers:
            ["in", "sel", "a", "b"],
        default_code: 
            "module DMux(in, sel) -> a, b { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "And4Way",
        builtin_code:
            ` 
            module And4Way(a, b, c, d) -> out {
                And(a, b) -> a1
                And(a1, c) -> a2
                And(a2, d) -> out
            }`,
        test_cases: 
            [{inputs: [0, 0, 0, 0], outputs: [0]}, 
             {inputs: [0, 0, 0, 1], outputs: [0]},
             {inputs: [0, 0, 1, 0], outputs: [0]},
             {inputs: [0, 0, 1, 1], outputs: [0]},
             {inputs: [0, 1, 0, 0], outputs: [0]},
             {inputs: [0, 1, 0, 1], outputs: [0]},
             {inputs: [0, 1, 1, 0], outputs: [0]},
             {inputs: [0, 1, 1, 1], outputs: [0]},
             {inputs: [1, 0, 0, 0], outputs: [0]},
             {inputs: [1, 0, 0, 1], outputs: [0]},
             {inputs: [1, 0, 1, 0], outputs: [0]},
             {inputs: [1, 0, 1, 1], outputs: [0]},
             {inputs: [1, 1, 0, 0], outputs: [0]},
             {inputs: [1, 1, 0, 1], outputs: [0]},
             {inputs: [1, 1, 1, 0], outputs: [0]},
             {inputs: [1, 1, 1, 1], outputs: [1]}],
        identifiers:
            ["a", "b", "c", "d", "out"],
        default_code: 
            "module And4Way(a, b, c, d) -> out { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "Or4Way",
        builtin_code:
            ` 
            module Or4Way(a[4]) -> out {
                Or(a[0], a[1]) -> a1
                Or(a1, a[2]) -> a2
                Or(a2, a[3]) -> out
            }`,
        test_cases: 
            [{inputs: [0, 0, 0, 0], outputs: [0]}, 
             {inputs: [0, 0, 0, 1], outputs: [1]},
             {inputs: [0, 0, 1, 0], outputs: [1]},
             {inputs: [0, 0, 1, 1], outputs: [1]},
             {inputs: [0, 1, 0, 0], outputs: [1]},
             {inputs: [0, 1, 0, 1], outputs: [1]},
             {inputs: [0, 1, 1, 0], outputs: [1]},
             {inputs: [0, 1, 1, 1], outputs: [1]},
             {inputs: [1, 0, 0, 0], outputs: [1]},
             {inputs: [1, 0, 0, 1], outputs: [1]},
             {inputs: [1, 0, 1, 0], outputs: [1]},
             {inputs: [1, 0, 1, 1], outputs: [1]},
             {inputs: [1, 1, 0, 0], outputs: [1]},
             {inputs: [1, 1, 0, 1], outputs: [1]},
             {inputs: [1, 1, 1, 0], outputs: [1]},
             {inputs: [1, 1, 1, 1], outputs: [1]}],
        identifiers:
            ["a", "b", "c", "d", "out"],
        default_code: 
            "module Or4Way(a, b, c, d) -> out { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "Not8",
        builtin_code:
            ` 
            module Not8(in[8]) -> out[8] {
                Not(in[0]) -> out[0]
                Not(in[1]) -> out[1]
                Not(in[2]) -> out[2]
                Not(in[3]) -> out[3]
                Not(in[4]) -> out[4]
                Not(in[5]) -> out[5]
                Not(in[6]) -> out[6]
                Not(in[7]) -> out[7]
            }`,
        test_cases: 
            [{inputs: ["00000000"], outputs: ["11111111"]}, 
             {inputs: ["11111111"], outputs: ["00000000"]},
             {inputs: ["10101010"], outputs: ["01010101"]},
             {inputs: ["01010101"], outputs: ["10101010"]},
             {inputs: ["00001111"], outputs: ["11110000"]},
             {inputs: ["11110000"], outputs: ["00001111"]}],
        identifiers:
            ["in[8]", "out[8]"],
        default_code: 
            "module Not8(in[8]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "And8",
        builtin_code:
            ` 
            module And8(a[8], b[8]) -> out[8] {
                And(a[0], b[0]) -> out[0]
                And(a[1], b[1]) -> out[1]
                And(a[2], b[2]) -> out[2]
                And(a[3], b[3]) -> out[3]
                And(a[4], b[4]) -> out[4]
                And(a[5], b[5]) -> out[5]
                And(a[6], b[6]) -> out[6]
                And(a[7], b[7]) -> out[7]
            }`,
        test_cases: 
            [
             {inputs: ["00000000", "00000000"], outputs: ["00000000"]}, 
             {inputs: ["11111111", "00000000"], outputs: ["00000000"]},
             {inputs: ["00000000", "11111111"], outputs: ["00000000"]},
             {inputs: ["11111111", "11111111"], outputs: ["11111111"]},
             {inputs: ["01010101", "01010101"], outputs: ["01010101"]},
             {inputs: ["10101010", "10101010"], outputs: ["10101010"]},
             {inputs: ["01010101", "10101010"], outputs: ["00000000"]},
            ],
        identifiers:
            ["a[8]", "b[8]", "out[8]"],
        default_code: 
            "module And8(a[8], b[8]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "Or8",
        builtin_code:
            ` 
            module Or8(a[8], b[8]) -> out[8] {
                Or(a[0], b[0]) -> out[0]
                Or(a[1], b[1]) -> out[1]
                Or(a[2], b[2]) -> out[2]
                Or(a[3], b[3]) -> out[3]
                Or(a[4], b[4]) -> out[4]
                Or(a[5], b[5]) -> out[5]
                Or(a[6], b[6]) -> out[6]
                Or(a[7], b[7]) -> out[7]
            }`,
        test_cases: [
             {inputs: ["00000000", "00000000"], outputs: ["00000000"]}, 
             {inputs: ["11111111", "00000000"], outputs: ["11111111"]},
             {inputs: ["00000000", "11111111"], outputs: ["11111111"]},
             {inputs: ["11111111", "11111111"], outputs: ["11111111"]},
             {inputs: ["01010101", "01010101"], outputs: ["01010101"]},
             {inputs: ["10101010", "10101010"], outputs: ["10101010"]},
             {inputs: ["01010101", "10101010"], outputs: ["11111111"]},
                    ],
        identifiers:
            ["a[8]", "b[8]", "out[8]"],
        default_code: 
            "module Or8(a[8], b[8]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "Xor8",
        builtin_code:
            ` 
            module Xor8(a[8], b[8]) -> out[8] {
                Xor(a[0], b[0]) -> out[0]
                Xor(a[1], b[1]) -> out[1]
                Xor(a[2], b[2]) -> out[2]
                Xor(a[3], b[3]) -> out[3]
                Xor(a[4], b[4]) -> out[4]
                Xor(a[5], b[5]) -> out[5]
                Xor(a[6], b[6]) -> out[6]
                Xor(a[7], b[7]) -> out[7]
            }`,
        test_cases: [
             {inputs: ["00000000", "00000000"], outputs: ["00000000"]}, 
             {inputs: ["11111111", "00000000"], outputs: ["11111111"]},
             {inputs: ["00000000", "11111111"], outputs: ["11111111"]},
             {inputs: ["11111111", "11111111"], outputs: ["00000000"]},
             {inputs: ["01010101", "01010101"], outputs: ["00000000"]},
             {inputs: ["10101010", "10101010"], outputs: ["00000000"]},
             {inputs: ["01010101", "10101010"], outputs: ["11111111"]},
            ],
        identifiers:
            ["a[8]", "b[8]", "out[8]"],
        default_code: 
            "module Xor8(a[8], b[8]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "Mux8",
        builtin_code:
            ` 
            module Mux8(a[8], b[8], sel) -> out[8] {
                Mux(a[0], b[0], sel) -> out[0]
                Mux(a[1], b[1], sel) -> out[1]
                Mux(a[2], b[2], sel) -> out[2]
                Mux(a[3], b[3], sel) -> out[3]
                Mux(a[4], b[4], sel) -> out[4]
                Mux(a[5], b[5], sel) -> out[5]
                Mux(a[6], b[6], sel) -> out[6]
                Mux(a[7], b[7], sel) -> out[7]
            }`,
        test_cases: [
             {inputs: ["00000000", "00000000", 0], outputs: ["00000000"]}, 
             {inputs: ["10001000", "01000100", 0], outputs: ["10001000"]}, 
             {inputs: ["11110000", "00001111", 0], outputs: ["11110000"]}, 
             {inputs: ["00001111", "11110000", 0], outputs: ["00001111"]}, 
             {inputs: ["00000000", "00000000", 1], outputs: ["00000000"]}, 
             {inputs: ["10001000", "01000100", 1], outputs: ["01000100"]}, 
             {inputs: ["11110000", "00001111", 1], outputs: ["00001111"]}, 
             {inputs: ["00001111", "11110000", 1], outputs: ["11110000"]}, 
            ],
        identifiers:
            ["a[8]", "b[8]", "sel", "out[8]"],
        default_code: 
            "module Mux8(a[8], b[8], sel) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    { 
        name: 
            "Or8Way",
        builtin_code:
            ` 
            module Or8Way(in[8]) -> out {
                Or(in[0], in[1]) -> a
                Or(a, in[2]) -> b
                Or(b, in[3]) -> c
                Or(c, in[4]) -> d
                Or(d, in[5]) -> e
                Or(e, in[6]) -> f
                Or(f, in[7]) -> out
            }`,
        test_cases: [
             {inputs: ["00000000"], outputs: [0]}, 
             {inputs: ["00000001"], outputs: [1]},
             {inputs: ["00000010"], outputs: [1]},
             {inputs: ["00000100"], outputs: [1]},
             {inputs: ["00001000"], outputs: [1]},
             {inputs: ["00010000"], outputs: [1]},
             {inputs: ["00100000"], outputs: [1]},
             {inputs: ["01000000"], outputs: [1]},
             {inputs: ["10000000"], outputs: [1]},
             {inputs: ["11111111"], outputs: [1]},
            ],
        identifiers:
            ["in[8]", "out"],
        default_code: 
            "module Or8Way(in[8]) -> out { \n    //write your code here\n}",
        draw_tables: true,
        description: "If any of the 8 inputs is high, the output of Or8Way will be high.  Otherwise will output low.",
        has_clk: false,
    },
    { 
        name: 
            "HalfAdder",
        builtin_code:
            ` 
            module HalfAdder(a, b) -> sum, carry {
                Xor(a, b) -> sum
                And(a, b) -> carry
            }`,
        test_cases: [
             {inputs: [0, 0], outputs: [0, 0]}, 
             {inputs: [0, 1], outputs: [1, 0]}, 
             {inputs: [1, 0], outputs: [1, 0]}, 
             {inputs: [1, 1], outputs: [0, 1]}, 
            ],
        identifiers:
            ["a", "b", "sum", "carry"],
        default_code: 
            "module HalfAdder(a, b) -> sum, carry { \n    //write your code here\n}",
        draw_tables: true,
        description: "Adds two bits, a and b.  Will output the sum and the carry bit.",
        has_clk: false,
    },
    { 
        name: 
            "FullAdder",
        builtin_code:
            ` 
            module FullAdder(a, b, c) -> sum, carry {
                HalfAdder(a, b) -> sum1, carry1
                HalfAdder(sum1, c) -> sum, carry2
                Or(carry1, carry2) -> carry
            }`,
        test_cases: [
            {inputs: [0, 0, 0], outputs: [0, 0]},
            {inputs: [0, 0, 1], outputs: [1, 0]},
            {inputs: [0, 1, 0], outputs: [1, 0]},
            {inputs: [0, 1, 1], outputs: [0, 1]},
            {inputs: [1, 0, 0], outputs: [1, 0]},
            {inputs: [1, 0, 1], outputs: [0, 1]},
            {inputs: [1, 1, 0], outputs: [0, 1]},
            {inputs: [1, 1, 1], outputs: [1, 1]},
            ],
        identifiers:
            ["a", "b", "c", "sum", "carry"],
        default_code: 
            "module FullAdder(a, b, c) -> sum, carry { \n    //write your code here\n}",
        draw_tables: true,
        description: "Adds three bits, a, b and c.  Will output the sum and carry bit.",
        has_clk: false,
    },
    { 
        name: 
            "Add8",
        builtin_code:
            ` 
            module Add8(a[8], b[8]) -> out[8], carry {
                HalfAdder(a[0], b[0]) -> out[0], carry0
                FullAdder(a[1], b[1], carry0) -> out[1], carry1
                FullAdder(a[2], b[2], carry1) -> out[2], carry2
                FullAdder(a[3], b[3], carry2) -> out[3], carry3

                FullAdder(a[4], b[4], carry3) -> out[4], carry4
                FullAdder(a[5], b[5], carry4) -> out[5], carry5
                FullAdder(a[6], b[6], carry5) -> out[6], carry6
                FullAdder(a[7], b[7], carry6) -> out[7], carry
            }`,
        test_cases: [
            {inputs: ["00000000", "00000000"], outputs: ["00000000", 0]},
            {inputs: ["00000001", "00000000"], outputs: ["00000001", 0]},
            {inputs: ["00000001", "00000001"], outputs: ["00000010", 0]},
            {inputs: ["00000011", "00000111"], outputs: ["00001010", 0]},
            {inputs: ["00001111", "11110000"], outputs: ["11111111", 0]},
            {inputs: ["01010101", "10101010"], outputs: ["11111111", 0]},
            {inputs: ["10000000", "00000001"], outputs: ["10000001", 0]},
            {inputs: ["11111111", "00000001"], outputs: ["00000000", 1]},
            {inputs: ["11111111", "11111111"], outputs: ["11111110", 1]},
            ],
        identifiers:
            ["a[8]", "b[8]", "out[8]", "carry"],
        default_code: 
            "module Add8(a[8], b[8]) -> out[8], carry { \n    //write your code here\n}",
        draw_tables: true,
        description: "Adds two 8-bit numbers, a and b.  Will output the sum, an 8-bit number, and a carry bit.",
        has_clk: false,
    },
    { 
        name: 
            "Inc8",
        builtin_code:
            ` 
            module Inc8(a[8], inc) -> out[8] {
                {1, 0, 0, 0, 0, 0, 0, 0}  -> b
                Mux8(0, b, inc) -> mux
                Add8(a, mux) -> out, carry
            }`,
        test_cases: [
            {inputs: ["00000000", 0], outputs: ["00000000"]},
            {inputs: ["00000001", 0], outputs: ["00000001"]},
            {inputs: ["11111111", 0], outputs: ["11111111"]},
            {inputs: ["00001111", 0], outputs: ["00001111"]},
            {inputs: ["00000000", 1], outputs: ["00000001"]},
            {inputs: ["00000011", 1], outputs: ["00000100"]},
            {inputs: ["11111101", 1], outputs: ["11111110"]},
            {inputs: ["11111111", 1], outputs: ["00000000"]},
            {inputs: [], outputs: []},
            ],
        identifiers:
            ["a[8]", "inc", "out[8]"],
        default_code: 
            "module Inc8(a[8], inc) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "If inc is high, will output a + 1.  Otherwise output a.",
        has_clk: false,
    },
    { 
        name: 
            "ALU",
        builtin_code:
            ` 
            module ALU(x[8], y[8], ny) -> out[8], carry, zero {
                Xor8(y, 1) -> flipped
                Inc8(flipped, 1) -> negY
                Mux8(y, negY, ny) -> finaly

                Add8(x, finaly) -> result, carry
                result -> out
                Or8Way(result) -> or
                Not(or) -> zero
            }`,
        test_cases: [
            {inputs: ["00000000", "00000000", 0], outputs: ["00000000", 0, 1]},
            {inputs: ["00000001", "11111110", 0], outputs: ["11111111", 0, 0]},
            {inputs: ["11111111", "00000001", 0], outputs: ["00000000", 1, 1]},
            {inputs: ["11111111", "11111111", 0], outputs: ["11111110", 1, 0]},
            {inputs: ["10000000", "10000000", 0], outputs: ["00000000", 1, 1]},
            {inputs: ["00111000", "00000111", 0], outputs: ["00111111", 0, 0]},
            {inputs: ["00001111", "00000111", 0], outputs: ["00010110", 0, 0]},

            {inputs: ["00000000", "00000111", 1], outputs: ["11111001", 0, 0]},
            {inputs: ["00000000", "11111111", 1], outputs: ["00000001", 0, 0]},
            {inputs: ["00001000", "00001000", 1], outputs: ["00000000", 1, 1]},
            {inputs: ["00010000", "00001000", 1], outputs: ["00001000", 1, 0]},
            {inputs: ["00001000", "00010000", 1], outputs: ["11111000", 0, 0]},
            {inputs: ["01111111", "01111111", 1], outputs: ["00000000", 1, 1]},
            {inputs: ["01110011", "01110000", 1], outputs: ["00000011", 1, 0]},
            {inputs: ["11111111", "00000001", 1], outputs: ["11111110", 1, 0]},
            ],
        identifiers:
            ["x[8]", "y[8]", "ny", "out[8]", "carry", "zero"],
        default_code: 
            "module ALU(x[8], y[8], ny) -> out[8], cr, zr { \n    //write your code here\n}",
        draw_tables: true,
        description: "Will add two 8-bit numbers, x and y.  If ny is high, will negate y using two's complement format before addition.  Outputs sum, carry flag, and zero flag.",
        has_clk: false,
    },
    {
        name: 
            "Mux4Way8",
        builtin_code:
            ` 
            module Mux4Way8(a[8], b[8], c[8], d[8], sel[2]) -> out[8] {
                Mux8(a, b, sel[0]) -> out1
                Mux8(c, d, sel[0]) -> out2
                Mux8(out1, out2, sel[1]) -> out
            }`,
        test_cases: [
                {inputs: ["00000011", "00001100", "00110000", "11000000", "00"], outputs: ["00000011"]},
                {inputs: ["00000011", "00001100", "00110000", "11000000", "01"], outputs: ["00001100"]},
                {inputs: ["00000011", "00001100", "00110000", "11000000", "10"], outputs: ["00110000"]},
                {inputs: ["00000011", "00001100", "00110000", "11000000", "11"], outputs: ["11000000"]},
            ],
        identifiers:
            ["a[8]", "b[8]", "c[8]", "d[8]", "sel[2]", "out[8]"],
        default_code: 
            "module Mux4Way8(a[8], b[8], c[8], d[8], sel[2]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "Will output buses a, b, c or d based on sel.  Output a when sel is 00.  Output b when sel is 01.  Output c when sel is 10.  Output d when sel is 11.",
        has_clk: false,
    },
    {
        name: 
            "Mux8Way8",
        builtin_code:
            ` 
            module Mux8Way8(a[8], b[8], c[8], d[8], 
                             e[8], f[8], g[8], h[8],
                             sel[3]) -> out[8] {
                Mux4Way8(a, b, c, d, sel[0..1]) -> out1
                Mux4Way8(e, f, g, h, sel[0..1]) -> out2
                Mux8(out1, out2, sel[2]) -> out
            }`,
        test_cases: [
                {inputs: ["00000011", "00001100", "00110000", "11000000", "00000111", "00011100", "01110000", "11100000", "000"], outputs: ["00000011"]},
                {inputs: ["00000011", "00001100", "00110000", "11000000", "00000111", "00011100", "01110000", "11100000", "001"], outputs: ["00001100"]},
                {inputs: ["00000011", "00001100", "00110000", "11000000", "00000111", "00011100", "01110000", "11100000", "010"], outputs: ["00110000"]},
                {inputs: ["00000011", "00001100", "00110000", "11000000", "00000111", "00011100", "01110000", "11100000", "011"], outputs: ["11000000"]},
                {inputs: ["00000011", "00001100", "00110000", "11000000", "00000111", "00011100", "01110000", "11100000", "100"], outputs: ["00000111"]},
                {inputs: ["00000011", "00001100", "00110000", "11000000", "00000111", "00011100", "01110000", "11100000", "101"], outputs: ["00011100"]},
                {inputs: ["00000011", "00001100", "00110000", "11000000", "00000111", "00011100", "01110000", "11100000", "110"], outputs: ["01110000"]},
                {inputs: ["00000011", "00001100", "00110000", "11000000", "00000111", "00011100", "01110000", "11100000", "111"], outputs: ["11100000"]},
            ],
        identifiers:
            ["a[8]", "b[8]", "c[8]", "d[8]", "e[8]", "f[8]", "g[8]", "h[8]", "sel[3]", "out[8]"],
        default_code: 
            "module Mux8Way8(a[8], b[8], c[8], d[8], e[8], f[8], g[8], h[8], sel[3]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "Will output buses a, b, c, e, f, g or h based on sel.  Output a when sel is 000.  Output b when sel is 001.  Output c when sel is 010.  Output d when sel is 011.  Output e when sel is 100.  Output f when sel is 101.  Output g when sel is 110.  Output h when sel is 111.",
        has_clk: false,
    },
    {
        name: 
            "DMux4Way",
        builtin_code:
            ` 
            module DMux4Way(in, sel[2]) -> a, b, c, d {
                DMux(in, sel[0]) -> t1, t2
                DMux(t1, sel[1]) -> a, c
                DMux(t2, sel[1]) -> b, d
            }`,
        test_cases: [
                {inputs: [0, "00"], outputs: [0, 0, 0, 0]},
                {inputs: [1, "00"], outputs: [1, 0, 0, 0]},

                {inputs: [0, "01"], outputs: [0, 0, 0, 0]},
                {inputs: [1, "01"], outputs: [0, 1, 0, 0]},

                {inputs: [0, "10"], outputs: [0, 0, 0, 0]},
                {inputs: [1, "10"], outputs: [0, 0, 1, 0]},

                {inputs: [0, "11"], outputs: [0, 0, 0, 0]},
                {inputs: [1, "11"], outputs: [0, 0, 0, 1]},
            ],
        identifiers:
            ["in", "sel[2]", "a", "b", "c", "d"],
        default_code: 
            "module DMux4Way(in, sel[2]) -> a, b, c, d { \n    //write your code here\n}",
        draw_tables: true,
        description: "Will output in to a, b, c or d based on sel; zero the other outputs.  a is in when sel is 00.  b is in when sel is 01. c is in when sel is 10.  d is in when sel is 11.",
        has_clk: false,
    },
    {
        name: 
            "DMux8Way",
        builtin_code:
            ` 
            module DMux8Way(in, sel[3]) -> a, b, c, d, e, f, g, h {
                DMux(in, sel[0]) -> t1, t2

                DMux(t1, sel[1]) -> t3, t5
                DMux(t2, sel[1]) -> t4, t6

                DMux(t3, sel[2]) -> a, e
                DMux(t4, sel[2]) -> b, f
                DMux(t5, sel[2]) -> c, g
                DMux(t6, sel[2]) -> d, h
            }`,
        test_cases: [
                {inputs: [0, "000"], outputs: [0, 0, 0, 0, 0, 0, 0, 0]},
                {inputs: [1, "000"], outputs: [1, 0, 0, 0, 0, 0, 0, 0]},

                {inputs: [0, "001"], outputs: [0, 0, 0, 0, 0, 0, 0, 0]},
                {inputs: [1, "001"], outputs: [0, 1, 0, 0, 0, 0, 0, 0]},

                {inputs: [0, "010"], outputs: [0, 0, 0, 0, 0, 0, 0, 0]},
                {inputs: [1, "010"], outputs: [0, 0, 1, 0, 0, 0, 0, 0]},

                {inputs: [0, "011"], outputs: [0, 0, 0, 0, 0, 0, 0, 0]},
                {inputs: [1, "011"], outputs: [0, 0, 0, 1, 0, 0, 0, 0]},

                {inputs: [0, "100"], outputs: [0, 0, 0, 0, 0, 0, 0, 0]},
                {inputs: [1, "100"], outputs: [0, 0, 0, 0, 1, 0, 0, 0]},

                {inputs: [0, "101"], outputs: [0, 0, 0, 0, 0, 0, 0, 0]},
                {inputs: [1, "101"], outputs: [0, 0, 0, 0, 0, 1, 0, 0]},

                {inputs: [0, "110"], outputs: [0, 0, 0, 0, 0, 0, 0, 0]},
                {inputs: [1, "110"], outputs: [0, 0, 0, 0, 0, 0, 1, 0]},

                {inputs: [0, "111"], outputs: [0, 0, 0, 0, 0, 0, 0, 0]},
                {inputs: [1, "111"], outputs: [0, 0, 0, 0, 0, 0, 0, 1]},
            ],
        identifiers:
            ["in", "sel[3]", "a", "b", "c", "d", "e", "f", "g", "h"],
        default_code: 
            "module DMux8Way(in, sel[3]) -> a, b, c, d, e, f, g, h { \n    //write your code here\n}",
        draw_tables: true,
        description: "Will output in to a, b, c, d, e, f, g, h when sel is 000, 001, 010, 011, 100, 101, 110, 111, respectively; zero the other outputs.",
        has_clk: false,
    },
    {
        name: 
            "Bit",
        builtin_code:
            ` 
            module Bit(in, load) -> out {
                Mux(dffOut, in, load) -> muxOut
                Dff(muxOut) -> dffOut
                dffOut -> out
            }`,
        test_cases: [
                {inputs: [0, 0], outputs: [0]},
                {inputs: [0, 0], outputs: [0]},
                {inputs: [1, 1], outputs: [0]},
                {inputs: [1, 1], outputs: [1]},
                {inputs: [0, 1], outputs: [1]},
                {inputs: [0, 1], outputs: [0]},
                {inputs: [1, 0], outputs: [0]},
                {inputs: [1, 0], outputs: [0]},
            ],
        identifiers:
            ["in", "load", "out"],
        default_code: 
            "module Bit(in, load) -> out { \n    //write your code here\n}",
        draw_tables: true,
        description: "Memory unit storing a single bit.  When load is set, the bit will save in to state on a rising clock edge.  Output the state.",
        has_clk: true,
    },
    {
        name: 
            "Register",
        builtin_code:
            ` 
            module Register(in[8], load) -> out[8] {
                Bit(in[0], load) -> out[0]
                Bit(in[1], load) -> out[1]
                Bit(in[2], load) -> out[2]
                Bit(in[3], load) -> out[3]
                Bit(in[4], load) -> out[4]
                Bit(in[5], load) -> out[5]
                Bit(in[6], load) -> out[6]
                Bit(in[7], load) -> out[7]
            }`,
        test_cases: [
                {inputs: ["00000000", 0], outputs: ["00000000"]},
                {inputs: ["00000011", 0], outputs: ["00000000"]},
                {inputs: ["10000000", 1], outputs: ["00000000"]},
                {inputs: ["11100000", 1], outputs: ["11100000"]},
                {inputs: ["00000000", 1], outputs: ["11100000"]},
                {inputs: ["00011000", 1], outputs: ["00011000"]},
                {inputs: ["10000001", 0], outputs: ["00011000"]},
                {inputs: ["10000001", 0], outputs: ["00011000"]},
            ],
        identifiers:
            ["in[8]", "load", "out[8]"],
        default_code: 
            "module Register(in[8], load) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "Memory unit storing 8 bits.  The register will save in[8] to state when load is set.  Output the state out[8].",
        has_clk: true,
    },
    {
        name: 
            "Ram4",
        builtin_code:
            ` 
            module Ram4(data[8], load, addr[2]) -> out[8] {
                DMux4Way(load, addr) -> loadA, loadB, loadC, loadD
                Register(data, loadA) -> aout
                Register(data, loadB) -> bout
                Register(data, loadC) -> cout
                Register(data, loadD) -> dout
                Mux4Way8(aout, bout, cout, dout, addr) -> out
            }`,
        test_cases: [
                {inputs: ["00000000", 0, "00"], outputs: ["00000000"]},
                {inputs: ["00000011", 1, "00"], outputs: ["00000011"]},

                {inputs: ["10000010", 1, "00"], outputs: ["00000011"]},
                {inputs: ["00001100", 1, "01"], outputs: ["00001100"]},

                {inputs: ["00000000", 1, "01"], outputs: ["00001100"]},
                {inputs: ["00110000", 1, "10"], outputs: ["00110000"]},

                {inputs: ["10001001", 0, "10"], outputs: ["00110000"]},
                {inputs: ["11000000", 1, "11"], outputs: ["11000000"]},

                {inputs: ["11111111", 0, "00"], outputs: ["00000011"]},
                {inputs: ["11111111", 0, "01"], outputs: ["00001100"]},
                {inputs: ["11111111", 0, "10"], outputs: ["00110000"]},
                {inputs: ["11111111", 0, "11"], outputs: ["11000000"]},
            ],
        identifiers:
            ["in[8]", "load", "addr[2]", "out[8]"],
        default_code: 
            "module Ram4(in[8], load, addr[2]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "Memory unit storing 4 bytes at addresses 0, 1, 2, and 3. When load is set, data will be saved to the given address addr[2].",
        has_clk: true,
    },
    {
        name: 
            "Ram16",
        builtin_code:
            ` 
            module Ram16(data[8], load, addr[4]) -> out[8] {
                DMux4Way(load, addr[2..3]) -> loadA, loadB, loadC, loadD
                Ram4(data, loadA, addr[0..1]) -> aout
                Ram4(data, loadB, addr[0..1]) -> bout
                Ram4(data, loadC, addr[0..1]) -> cout
                Ram4(data, loadD, addr[0..1]) -> dout
                Mux4Way8(aout, bout, cout, dout, addr[2..3]) -> out
            }`,
        test_cases: [
                {inputs: ["00000000", 0, "0000"], outputs: ["00000000"]},
                {inputs: ["00000011", 1, "0000"], outputs: ["00000011"]},

                {inputs: ["10000010", 1, "0000"], outputs: ["00000011"]},
                {inputs: ["00001100", 1, "0001"], outputs: ["00001100"]},

                {inputs: ["00000000", 1, "0001"], outputs: ["00001100"]},
                {inputs: ["00110000", 1, "0010"], outputs: ["00110000"]},

                {inputs: ["10001001", 0, "0010"], outputs: ["00110000"]},
                {inputs: ["11000000", 1, "0011"], outputs: ["11000000"]},

                {inputs: ["11111111", 0, "0011"], outputs: ["11000000"]},
                {inputs: ["00000011", 1, "0100"], outputs: ["00000011"]},

                {inputs: ["10000010", 1, "0100"], outputs: ["00000011"]},
                {inputs: ["00001100", 1, "1001"], outputs: ["00001100"]},

                {inputs: ["00000000", 1, "1001"], outputs: ["00001100"]},
                {inputs: ["00110000", 1, "1110"], outputs: ["00110000"]},

                {inputs: ["10001001", 0, "1110"], outputs: ["00110000"]},
                {inputs: ["11000000", 1, "1111"], outputs: ["11000000"]},

                {inputs: ["00000000", 0, "0000"], outputs: ["00000011"]},
                {inputs: ["00000000", 0, "0001"], outputs: ["00001100"]},
                {inputs: ["00000000", 0, "0010"], outputs: ["00110000"]},
                {inputs: ["00000000", 0, "0011"], outputs: ["11000000"]},
                {inputs: ["00000000", 0, "0100"], outputs: ["00000011"]},
                {inputs: ["00000000", 0, "1001"], outputs: ["00001100"]},
                {inputs: ["00000000", 0, "1110"], outputs: ["00110000"]},
                {inputs: ["00000000", 0, "1111"], outputs: ["11000000"]},
            ],
        identifiers:
            ["in[8]", "load", "addr[4]", "out[8]"],
        default_code: 
            "module Ram16(in[8], load, addr[4]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "Memory unit storing 16 bytes at addresses 0 - 15.  When load is set, data will be saved to the given address addr[4].  The output will be the byte at address addr[4].",
        has_clk: true,
    },
    {
        name: 
            "PC",
        builtin_code:
            ` 
            module PC(reset, inc) -> out[8] {
                Inc8(reg, inc) -> incout
                Mux8(incout, 0, reset) -> mux
                Register(mux, 1) -> reg
                reg -> out
            }`,
        test_cases: [
                {inputs: [0, 0], outputs: ["00000000"]},
                {inputs: [0, 1], outputs: ["00000001"]},

                {inputs: [0, 1], outputs: ["00000001"]},
                {inputs: [0, 1], outputs: ["00000010"]},

                {inputs: [0, 0], outputs: ["00000010"]},
                {inputs: [1, 0], outputs: ["00000000"]},

                {inputs: [0, 1], outputs: ["00000000"]},
                {inputs: [0, 1], outputs: ["00000001"]},
            ],
        identifiers:
            ["reset", "inc", "out[8]"],
        default_code: 
            "module PC(reset, inc) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "Stores current instruction address.  When inc is set, PC will increment state by 1.  When reset is set, PC state will reset to 0.  Output the current state.",
        has_clk: true,
    },
    {
        name: 
            "ShiftRegister",
        builtin_code:
            ` 
            module ShiftRegister(reset) -> out[6] {
                Bit(o5, 1) -> b0
                b0 -> out[0]

                Bit(o0, 1) -> b1
                b1 -> out[1]

                Bit(o1, 1) -> b2
                b2 -> out[2]

                Bit(o2, 1) -> b3
                b3 -> out[3]

                Bit(o3, 1) -> b4
                b4 -> out[4]

                Bit(o4, 1) -> b5
                b5 -> out[5]

                Mux(b0, 0, reset) -> o0
                Mux(b1, 0, reset) -> o1
                Mux(b2, 0, reset) -> o2
                Mux(b3, 0, reset) -> o3
                Mux(b4, 0, reset) -> o4
                Mux(b5, 1, reset) -> o5
            }`,
        test_cases: [
                {inputs: [0], outputs: ["000000"]},
                {inputs: [1], outputs: ["000001"]},
                {inputs: [0], outputs: ["000001"]},
                {inputs: [0], outputs: ["000010"]},
                {inputs: [0], outputs: ["000010"]},
                {inputs: [0], outputs: ["000100"]},
                {inputs: [0], outputs: ["000100"]},
                {inputs: [0], outputs: ["001000"]},
                {inputs: [0], outputs: ["001000"]},
                {inputs: [0], outputs: ["010000"]},
                {inputs: [0], outputs: ["010000"]},
                {inputs: [0], outputs: ["100000"]},
                {inputs: [0], outputs: ["100000"]},
                {inputs: [0], outputs: ["000001"]},
            ],
        identifiers:
            ["reset", "out[6]"],
        default_code: 
            "module ShiftRegister(reset) -> out[6] { \n    //write your code here\n}",
        draw_tables: true,
        description: "Used to track current position in instruction cycle.  Shift registers will only have a single high bit at any given time.  Pefforms a left-bit shift on each high clock cycle, wrapping if necessary. Reset will reset the first bit to 1 and all others to 0.  On each high clock tick, the next more-significant bit will be set high.",
        has_clk: true,
    },
    {
        name: 
            "Decoder",
        builtin_code:
            `
            module Decoder(ring[6], t0[8], t1[8],  t2[8], t3[8],  t4[8], t5[8]) -> signals[8] {
                Mux8(t0, t1, ring[1]) -> m0
                Mux8(m0, t2, ring[2]) -> m1
                Mux8(m1, t3, ring[3]) -> m2
                Mux8(m2, t4, ring[4]) -> m3
                Mux8(m3, t5, ring[5]) -> signals
            }`,
        test_cases: [
                    {inputs: ["000001", "00110000", "01100011", "11000110", "00110010", "01100000", "00110000"], outputs: ["00110000"]},
                    {inputs: ["000001", "11100011", "00000011", "00011000", "00110001", "00001100", "11000000"], outputs: ["11100011"]},

                    {inputs: ["000010", "00110000", "01100011", "11000110", "00110010", "01100000", "00110000"], outputs: ["01100011"]},
                    {inputs: ["000010", "11100011", "00000011", "00011000", "00110001", "00001100", "11000000"], outputs: ["00000011"]},

                    {inputs: ["000100", "00110000", "01100011", "11000110", "00110010", "01100000", "00110000"], outputs: ["11000110"]},
                    {inputs: ["000100", "11100011", "00000011", "00011000", "00110001", "00001100", "11000000"], outputs: ["00011000"]},

                    {inputs: ["001000", "00110000", "01100011", "11000110", "00110010", "01100000", "00110000"], outputs: ["00110010"]},
                    {inputs: ["001000", "11100011", "00000011", "00011000", "00110001", "00001100", "11000000"], outputs: ["00110001"]},

                    {inputs: ["010000", "00110000", "01100011", "11000110", "00110010", "01100000", "00110000"], outputs: ["01100000"]},
                    {inputs: ["010000", "11100011", "00000011", "00011000", "00110001", "00001100", "11000000"], outputs: ["00001100"]},

                    {inputs: ["100000", "00110000", "01100011", "11000110", "00110010", "01100000", "00110000"], outputs: ["00110000"]},
                    {inputs: ["100000", "11100011", "00000011", "00011000", "00110001", "00001100", "11000000"], outputs: ["11000000"]},
            ],
        identifiers:
            ["sr[6]", "a[8]", "b[8]", "c[8]", "d[8]", "e[8]", "f[8]", "out[8]"],
        default_code: 
            "module Decoder(sr[6], a[8], b[8],  c[8], d[8],  e[8], f[8]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    {
        name: 
            "NOPControlStore",
        builtin_code:
            `
            module NOPControlStore(ring[6]) -> signals[8] {
                {0, 0, 1,   0, 0, 1,   0, 0} -> t0 //load MAR with PC, and increment PC
                {1, 0, 0,   1, 1, 0,   0, 0} -> t1 //load MDR with RAM[MAR]
                {1, 0, 1,   1, 0, 0,   0, 0} -> t2 //load CIR with MDR
                {0, 0, 0,   0, 0, 0,   0, 0} -> t3 //NOP
                {0, 0, 0,   0, 0, 0,   0, 0} -> t4 //NOP
                {0, 0, 0,   0, 0, 0,   0, 0} -> t5 //NOP

                Decoder(ring, t0, t1, t2, t3, t4, t5) -> signals
            }`,
        test_cases: [
                    {inputs: ["000001"], outputs: ["00100100"]},
                    {inputs: ["000010"], outputs: ["00011001"]},
                    {inputs: ["000100"], outputs: ["00001101"]},
                    {inputs: ["001000"], outputs: ["00000000"]},
                    {inputs: ["010000"], outputs: ["00000000"]},
                    {inputs: ["100000"], outputs: ["00000000"]},
            ],
        identifiers:
            ["sr[6]", "out[8]"],
        default_code: 
            "module NOPControlStore(sr[6]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    {
        name: 
            "LDAControlStore",
        builtin_code:
            `
            module LDAControlStore(ring[6]) -> signals[8] {
                {0, 0, 1,   0, 0, 1,   0, 0} -> t0 //load MAR with PC, and increment PC
                {1, 0, 0,   1, 1, 0,   0, 0} -> t1 //load MDR with RAM[MAR]
                {1, 0, 1,   1, 0, 0,   0, 0} -> t2 //load CIR with MDR
                {0, 0, 1,   0, 1, 1,   0, 0} -> t3 //load MAR with LDA operand
                {1, 0, 0,   1, 1, 0,   0, 0} -> t4 //load MDR with RAM[MAR]
                {0, 1, 0,   1, 0, 0,   0, 0} -> t5 //load ACC with MDR

                Decoder(ring, t0, t1, t2, t3, t4, t5) -> signals
            }`,
        test_cases: [
                    {inputs: ["000001"], outputs: ["00100100"]},
                    {inputs: ["000010"], outputs: ["00011001"]},
                    {inputs: ["000100"], outputs: ["00001101"]},
                    {inputs: ["001000"], outputs: ["00110100"]},
                    {inputs: ["010000"], outputs: ["00011001"]},
                    {inputs: ["100000"], outputs: ["00001010"]},
            ],
        identifiers:
            ["sr[6]", "out[8]"],
        default_code: 
            "module LDAControlStore(sr[6]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    {
        name: 
            "ADDControlStore",
        builtin_code:
            `
            module ADDControlStore(ring[6]) -> signals[8] {
                {0, 0, 1,   0, 0, 1,   0, 0} -> t0 //load MAR with PC, and increment PC
                {1, 0, 0,   1, 1, 0,   0, 0} -> t1 //load MDR with RAM[MAR]
                {1, 0, 1,   1, 0, 0,   0, 0} -> t2 //load CIR with MDR
                {0, 0, 1,   0, 1, 1,   0, 0} -> t3 //load MAR with operand
                {1, 0, 0,   1, 1, 0,   0, 0} -> t4 //load MDR with RAM[MAR]
                {0, 1, 0,   1, 0, 1,   0, 0} -> t5 //load ACC with ACC + MDR

                Decoder(ring, t0, t1, t2, t3, t4, t5) -> signals
            }`,
        test_cases: [
                    {inputs: ["000001"], outputs: ["00100100"]},
                    {inputs: ["000010"], outputs: ["00011001"]},
                    {inputs: ["000100"], outputs: ["00001101"]},
                    {inputs: ["001000"], outputs: ["00110100"]},
                    {inputs: ["010000"], outputs: ["00011001"]},
                    {inputs: ["100000"], outputs: ["00101010"]},
            ],
        identifiers:
            ["sr[6]", "out[8]"],
        default_code: 
            "module ADDControlStore(sr[6]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    {
        name: 
            "SUBControlStore",
        builtin_code:
            `
            module SUBControlStore(ring[6]) -> signals[8] {
                {0, 0, 1,   0, 0, 1,   0, 0} -> t0 //load MAR with PC, and increment PC
                {1, 0, 0,   1, 1, 0,   0, 0} -> t1 //load MDR with RAM[MAR]
                {1, 0, 1,   1, 0, 0,   0, 0} -> t2 //load CIR with MDR
                {0, 0, 1,   0, 1, 1,   0, 0} -> t3 //load MAR with operand
                {1, 0, 0,   1, 1, 0,   0, 0} -> t4 //load MDR with RAM[MAR]
                {0, 1, 0,   1, 0, 1,   1, 0} -> t5 //load ACC with ACC - MDR

                Decoder(ring, t0, t1, t2, t3, t4, t5) -> signals
            }`,
        test_cases: [
                    {inputs: ["000001"], outputs: ["00100100"]},
                    {inputs: ["000010"], outputs: ["00011001"]},
                    {inputs: ["000100"], outputs: ["00001101"]},
                    {inputs: ["001000"], outputs: ["00110100"]},
                    {inputs: ["010000"], outputs: ["00011001"]},
                    {inputs: ["100000"], outputs: ["01101010"]},
            ],
        identifiers:
            ["sr[6]", "out[8]"],
        default_code: 
            "module SUBControlStore(sr[6]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    {
        name: 
            "STAControlStore",
        builtin_code:
            `
            module STAControlStore(ring[6]) -> signals[8] {
                {0, 0, 1,   0, 0, 1,   0, 0} -> t0 //load MAR with PC, and increment PC
                {1, 0, 0,   1, 1, 0,   0, 0} -> t1 //load MDR with RAM[MAR]
                {1, 0, 1,   1, 0, 0,   0, 0} -> t2 //load CIR with MDR
                {0, 0, 1,   0, 1, 1,   0, 0} -> t3 //load MAR with operand
                {1, 0, 0,   0, 1, 0,   0, 0} -> t4 //load MDR with ACC
                {1, 1, 0,   1, 0, 0,   0, 0} -> t5 //load RAM[MAR] with MDR

                Decoder(ring, t0, t1, t2, t3, t4, t5) -> signals
            }`,
        test_cases: [
                    {inputs: ["000001"], outputs: ["00100100"]},
                    {inputs: ["000010"], outputs: ["00011001"]},
                    {inputs: ["000100"], outputs: ["00001101"]},
                    {inputs: ["001000"], outputs: ["00110100"]},
                    {inputs: ["010000"], outputs: ["00010001"]},
                    {inputs: ["100000"], outputs: ["00001011"]},
            ],
        identifiers:
            ["sr[6]", "out[8]"],
        default_code: 
            "module STAControlStore(sr[6]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    {
        name: 
            "HLTControlStore",
        builtin_code:
            `
            module HLTControlStore(ring[6]) -> signals[8] {
                {0, 0, 1,   0, 0, 1,   0, 0} -> t0 //load MAR with PC, and increment PC
                {1, 0, 0,   1, 1, 0,   0, 0} -> t1 //load MDR with RAM[MAR]
                {1, 0, 1,   1, 0, 0,   0, 0} -> t2 //load CIR with MDR
                {0, 0, 0,   0, 0, 0,   0, 1} -> t3 //halt
                {0, 0, 0,   0, 0, 0,   0, 0} -> t4 //NOP
                {0, 0, 0,   0, 0, 0,   0, 0} -> t5 //NOP

                Decoder(ring, t0, t1, t2, t3, t4, t5) -> signals
            }`,
        test_cases: [
                    {inputs: ["000001"], outputs: ["00100100"]},
                    {inputs: ["000010"], outputs: ["00011001"]},
                    {inputs: ["000100"], outputs: ["00001101"]},
                    {inputs: ["001000"], outputs: ["10000000"]},
                    {inputs: ["010000"], outputs: ["00000000"]},
                    {inputs: ["100000"], outputs: ["00000000"]},
            ],
        identifiers:
            ["sr[6]", "out[8]"],
        default_code: 
            "module HLTControlStore(sr[6]) -> out[8] { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: false,
    },
    {
        name: 
            "ControlUnit",
        builtin_code:
            `
            module ControlUnit(cir[8], reset) -> dst[3], src[3], negY, halt {
                ShiftRegister(reset) -> ring

                NOPControlStore(ring) -> nop
                LDAControlStore(ring) -> lda
                HLTControlStore(ring) -> hlt
                ADDControlStore(ring) -> add
                SUBControlStore(ring) -> sub
                STAControlStore(ring) -> sta

                Mux8Way8(nop, lda, add, sub, sta, hlt, nop, nop, cir[0..2]) -> cs
                {cs[0], cs[1], cs[2]} -> dst
                {cs[3], cs[4], cs[5]} -> src
                cs[6] -> negY
                cs[7] -> halt
            }`,
        test_cases: [
                //NOP
                {inputs: ["00000000", 1], outputs: ["100", "100", 0, 0]}, //ringcounter=000000 will default to t0
                {inputs: ["00000000", 1], outputs: ["100", "100", 0, 0]},

                {inputs: ["00000000", 0], outputs: ["100", "100", 0, 0]},
                {inputs: ["00000000", 0], outputs: ["001", "011", 0, 0]},

                {inputs: ["00000000", 0], outputs: ["001", "011", 0, 0]},
                {inputs: ["00000000", 0], outputs: ["101", "001", 0, 0]},

                {inputs: ["00000000", 0], outputs: ["101", "001", 0, 0]},
                {inputs: ["00000000", 0], outputs: ["000", "000", 0, 0]},

                {inputs: ["00000000", 0], outputs: ["000", "000", 0, 0]},
                {inputs: ["00000000", 0], outputs: ["000", "000", 0, 0]},

                {inputs: ["00000000", 0], outputs: ["000", "000", 0, 0]},
                {inputs: ["00000000", 0], outputs: ["000", "000", 0, 0]},

                //LDA
                {inputs: ["00000001", 0], outputs: ["010", "001", 0, 0]}, //low clock cycle is still on t5
                {inputs: ["00000001", 0], outputs: ["100", "100", 0, 0]},

                {inputs: ["00000001", 0], outputs: ["100", "100", 0, 0]},
                {inputs: ["00000001", 0], outputs: ["001", "011", 0, 0]},

                {inputs: ["00000001", 0], outputs: ["001", "011", 0, 0]},
                {inputs: ["00000001", 0], outputs: ["101", "001", 0, 0]},

                {inputs: ["00000001", 0], outputs: ["101", "001", 0, 0]},
                {inputs: ["00000001", 0], outputs: ["100", "110", 0, 0]},

                {inputs: ["00000001", 0], outputs: ["100", "110", 0, 0]},
                {inputs: ["00000001", 0], outputs: ["001", "011", 0, 0]},

                {inputs: ["00000001", 0], outputs: ["001", "011", 0, 0]},
                {inputs: ["00000001", 0], outputs: ["010", "001", 0, 0]},
            ],
        identifiers:
            ["cir[8]", "reset", "dst[3]", "src[3]", "negY", "halt"],
        default_code: 
            "module ControlUnit(cir[8], reset) -> dst[3], src[3], negY, halt { \n    //write your code here\n}",
        draw_tables: true,
        description: "",
        has_clk: true,
    },
    {
        name: 
            "Computer",
        builtin_code:
            ` 
            module Computer(reset) -> halt {
                Mux8Way8(0, mdr, acc, mem, pc, alu, operand, 0, src) -> srcData
                DMux8Way(1, dst) -> null0, loadMdr, loadAcc, loadMem, loadMar, loadCir, null6, null7

                ram: Ram16(acc, loadMem, mar[0..3]) -> mem
                mar: Register(srcData, loadMar) -> mar
                mdr: Register(srcData, loadMdr) -> mdr
                acc: Register(srcData, loadAcc) -> acc
                cir: Register(srcData, loadCir) -> cir
                pc: PC(reset, inc) -> pc

                ALU(acc, mdr, negY) -> alu, carry, zero
                ControlUnit(cir, reset) -> dst, src, negY, halt

                Not(src[0]) -> ncs3
                Not(src[1]) -> ncs4
                And4Way(1, ncs3, ncs4, src[2]) -> inc

                {cir[4..7], 0, 0, 0, 0} -> operand
            }`,
        test_cases: [
                {inputs: ["0"], outputs: ["0"]},
                {inputs: ["1"], outputs: ["0"]},
            ],
        identifiers:
            ["reset", "halt"],
        default_code: 
            "module Computer(reset) -> halt { \n    //write your code here\n}",
        draw_tables: false, //!!!Using this as temporary switch to turn on computer simulation features
        description: "",
        has_clk: true,
    },
];

let grci_easy_init;
let grci_cleanup;
let grci_compile_src;
let grci_init_module;
let grci_destroy_module;
let grci_step_module;
let grci_set_input;
let grci_get_output;
let grci_submodule;
let grci_set_state;
let grci_get_state;
let grci_err;

function load_grci_module() {
    grci_easy_init = Module.cwrap('grci_easy_init', 'number');
    grci_cleanup = Module.cwrap('grci_cleanup', null, ['number']);
    grci_compile_src = Module.cwrap('grci_compile_src', 'number', ['number', 'string', 'number']);
    grci_init_module = Module.cwrap('grci_init_module', 'number', ['number', 'string', 'number']);
    grci_destroy_module = Module.cwrap('grci_destroy_module', null, ['number']);
    grci_step_module = Module.cwrap('grci_step_module', 'number', ['number']);
    grci_set_input = Module.cwrap('grci_set_input', null, ['number', 'number', 'number']);
    grci_get_output = Module.cwrap('grci_get_output', 'number', ['number', 'number']);
    grci_submodule = Module.cwrap('grci_submodule', 'number', ['number', 'string', 'number']);
    grci_set_state = Module.cwrap('grci_set_state', null, ['number', 'number', 'number']);
    grci_get_state = Module.cwrap('grci_get_state', 'number', ['number', 'number']);
    grci_err = Module.cwrap('grci_err', 'number', null);
}

function init_default_btn(codeTextarea, defaultCode, reset_btn) {
    let default_code_fcn = () => {
        codeTextarea.value = defaultCode;
    };

    default_code_fcn();
    reset_btn.addEventListener("click", default_code_fcn);
}

function make_html_table(name, test_cases, letters, is_truth_table, has_clk) {


    let html = is_truth_table ? "<table>" : `<table id="${name}Table">`;
    if (is_truth_table) {
        html += "<caption>TruthTable</caption>";
    } else {
        html += "<caption>Simulated</caption>";
    }
    html += "<tr>";
    if (has_clk) {
        html += `<th>clk</th>`;
    }
    test_cases[0].inputs.forEach((value, idx) => {
        html += `<th>${letters[idx]}</th>`;
    }); 
    test_cases[0].outputs.forEach((value, idx) => {
        html += `<th>${letters[test_cases[0].inputs.length + idx]}</th>`;
    }); 
    test_cases[0].outputs.forEach((value, idx) => {
        html += `<th><b>${letters[test_cases[0].inputs.length + idx]}</b></th>`;
    }); 
    html += "</tr>";

    test_cases.forEach((test_case, idx) => {
        html += "<tr>";
        if (has_clk) {
            html += `<td><tt>${idx % 2}</tt></td>`;
        }
        test_case.inputs.forEach((input) => { html += `<td><tt>${input}</tt></td>`; });
        test_case.outputs.forEach((output, output_idx) => { 
            html += `<td><tt>${output}</tt></td>`;
        });
        test_case.outputs.forEach((output, output_idx) => { 
            html += `<td id="${name + String(idx) + String(output_idx)}"><tt>-</tt></td>`;
        });
        html += "</tr>";
    });
    html += "</table>";
    return html;
}

function init_section(name, test_cases, identifiers, draw_tables, description, has_clk) {
    console.assert(test_cases.length > 0);
    console.assert(test_cases[0].inputs.length > 0);
    console.assert(test_cases[0].outputs.length > 0);
    let html = `
    <div class="inner_container">
        <div>
            <p id="description">${description}</p>
        </div>
        <div>`;

    if (draw_tables) {
        html += make_html_table(name, test_cases, identifiers, false, has_clk);
    } else {
        html += `
        <p id="cycle">Clock Cycle: 0</p>
        <div class="container">
            <table>
                <tr>
                    <th>Register</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>PC</td>
                    <td id="pc">00000000</td>
                </tr>
                <tr>
                    <td>MAR</td>
                    <td id="mar">00000000</td>
                </tr>
                <tr>
                    <td>MDR</td>
                    <td id="mdr">00000000</td>
                </tr>
                <tr>
                    <td>ACC</td>
                    <td id="acc">00000000</td>
                </tr>
                <tr>
                    <td>CIR</td>
                    <td id="cir">00000000</td>
                </tr>
            </table>
            <table>
                <tr>
                    <th>Addr</th>
                    <th>RAM[Addr]</th>
                </tr>
                <tr>
                    <td>0000</td>
                    <td id="ram0">00000000</td>
                </tr>
                <tr>
                    <td>0001</td>
                    <td id="ram1">00000000</td>
                </tr>
                <tr>
                    <td>0010</td>
                    <td id="ram2">00000000</td>
                </tr>
                <tr>
                    <td>0011</td>
                    <td id="ram3">00000000</td>
                </tr>
                <tr>
                    <td>0100</td>
                    <td id="ram4">00000000</td>
                </tr>
                <tr>
                    <td>0101</td>
                    <td id="ram5">00000000</td>
                </tr>
                <tr>
                    <td>0110</td>
                    <td id="ram6">00000000</td>
                </tr>
                <tr>
                    <td>0111</td>
                    <td id="ram7">00000000</td>
                </tr>
            </table>
            <table>
                <tr>
                    <th>Addr</th>
                    <th>RAM[Addr]</th>
                </tr>
                <tr>
                    <td>1000</td>
                    <td id="ram8">00000000</td>
                </tr>
                <tr>
                    <td>1001</td>
                    <td id="ram9">00000000</td>
                </tr>
                <tr>
                    <td>1010</td>
                    <td id="ram10">00000000</td>
                </tr>
                <tr>
                    <td>1011</td>
                    <td id="ram11">00000000</td>
                </tr>
                <tr>
                    <td>1100</td>
                    <td id="ram12">00000000</td>
                </tr>
                <tr>
                    <td>1101</td>
                    <td id="ram13">00000000</td>
                </tr>
                <tr>
                    <td>1110</td>
                    <td id="ram14">00000000</td>
                </tr>
                <tr>
                    <td>1111</td>
                    <td id="ram15">00000000</td>
                </tr>
            </table>
        </div>
        `;
    }

    html += `
        </div>
    </div>
    `

   // task.innerHTML = html;
    document.getElementById("terminal").innerHTML = html;
   //section.innerHTML = html;
}

function flatten_bits(arr) {
    let result = [];
    arr.forEach((value) => {
        if (typeof value === "string") {
            value.split("").reverse().forEach((c) => {
                result.push(Number(c));
            });
        } else {
            result.push(value);
        }
    });
    return result;
}

function compile_modules_up_to_idx(grci, modules, idx) {
    let src = '';
    modules.slice(0, idx).forEach((data) => {
        src += data.builtin_code;
    });

    assert(grci_compile_src(grci, src, src.length));
}

function init_sim_btn(sim_btn, code_textarea, idx, td_elements, sim_table, name, test_cases, draw_tables, range) {

    sim_btn.addEventListener("click", () => {
        load_grci_module();

        let data = JSON.parse(localStorage.getItem(name));
        let code = new DOMParser().parseFromString(code_textarea.value, "text/html").body.textContent;
        data.code = code;

        td_elements.forEach((element) => {
            element.innerHTML = "-";
        });
        sim_table.style.backgroundColor = "black";

        let grci = grci_easy_init();

        compile_modules_up_to_idx(grci, modules, idx);
        let result = grci_compile_src(grci, code, code.length);

        if (result === 1) {
            sim_btn.style.backgroundColor = "gray";
            let cleared = true;
            let module = grci_init_module(grci, name, name.length);
            test_cases.forEach((test_case, case_idx) => {
                let input_bits = flatten_bits(test_case.inputs);
                input_bits.forEach((value, idx) => {
                //test_case.inputs.forEach((value, idx) => {
                    grci_set_input(module, idx, value);
                });
                grci_step_module(module);
                let output_bits = flatten_bits(test_case.outputs);
                output_bits.forEach((value, idx) => {
                //test_case.outputs.forEach((value, idx) => {
                    let result = grci_get_output(module, idx);
                    /*
                    if (td_elements.length > 0) {
                        td_elements[case_idx * test_case.outputs.length + idx].innerHTML = '<tt>' + String(result) + '</tt>';
                    }
                    */
                    if (result != value) {
                        cleared = false;
                    } 
                });

                //fill table here
                let bit_idx = 0;
                test_case.outputs.forEach((value, idx) => {
                    if (typeof value === "string") {
                        let s = "";
                        for (let i = 0; i < value.length; i++) {
                            let result = grci_get_output(module, bit_idx);
                            bit_idx += 1;
                            s = String(result) + s;
                        }
                        td_elements[case_idx * test_case.outputs.length + idx].innerHTML = '<tt>' + s + '</tt>';
                    } else {
                        let result = grci_get_output(module, bit_idx);
                        td_elements[case_idx * test_case.outputs.length + idx].innerHTML = '<tt>' + String(result) + '</tt>';
                        bit_idx += 1;
                    }
                });
            });

            if (cleared) {
                data.cleared = true;
            }

            sim_table.style.backgroundColor = cleared ? "lightGreen" : "black";
            grci_destroy_module(module);
        } else {
            sim_btn.style.backgroundColor = "red";
            console.log(grci_err());
        }

        grci_cleanup(grci);
        console.log('saving', name);
        localStorage.setItem(name, JSON.stringify(data));
        set_button_color(name, idx, range);
    }); 
}

function init_task(name, idx, test_cases, identifiers, default_code, draw_tables, range, description, has_clk) {
    if (localStorage.getItem(name) === null) {
        localStorage.setItem(name, JSON.stringify({ name: name, cleared: false, code: default_code }));
    }
    let data = JSON.parse(localStorage.getItem(name));
    init_section(name, test_cases, identifiers, draw_tables, description, has_clk);

    let code_textarea = document.getElementById("code");
    let reset_btn = document.getElementById("reset_btn");
    let sim_btn = document.getElementById("sim_btn");
    let table = document.getElementById(name + "Table");

    init_default_btn(code_textarea, 
                     default_code,
                     reset_btn);

    code_textarea.value = data.code;

    let sim_outputs = []
    test_cases.forEach((test_case, idx) => {
        test_case.outputs.forEach((output, output_idx) => {
            let output_id = name + String(idx) + String(output_idx);
            sim_outputs.push(document.getElementById(output_id));
        });
    });
    sim_outputs = draw_tables ? sim_outputs : [];
    if (draw_tables)
        init_sim_btn(sim_btn, code_textarea, idx, sim_outputs, table, name, test_cases, draw_tables, range);
}

function set_button_color(name, idx, range) {
    if (localStorage.getItem(name) !== null) {
        let saved = JSON.parse(localStorage.getItem(name));
        if (saved.cleared) {
            let select_btn = document.getElementById(`${idx}`);
            select_btn.style.backgroundColor = "lightGreen";
            if (idx + 1 < range[1]) {
                let next_select_btn = document.getElementById(`${idx + 1}`);
                next_select_btn.removeAttribute("disabled");
            }
        }
    }
}


function display_register(submodule, element) {
    let string = "";
    for (let i = 0; i < 8; i++) {
        string += String(grci_get_state(submodule, i));
    }
    element.innerHTML = string.split("").reverse().join("");
}


let grci_instance = {
    grci: null,
    module: null,
    ram: null,
    pc: null,
    mar: null,
    mdr: null,
    cir: null,
    acc: null,
    halt: false,
    cycle: 0,
};
let start = -1;
let end = -1;
const ALU_START = 10;
const MEMORY_START = 21;
const CONTROL_UNIT_START = MEMORY_START + 10;
const COMPUTER_START = CONTROL_UNIT_START + 8;
lessons.addEventListener("change", (event) => {
    switch (event.target.value) {
    case "basic":
        start = 0;
        end = ALU_START; 
        break;
    case "advanced":
        start = ALU_START;
        end = MEMORY_START; 
        break;
    case "memory":
        start = MEMORY_START;
        end = CONTROL_UNIT_START;
        break;
    case "control_unit":
        start = CONTROL_UNIT_START;
        end = COMPUTER_START;
        break;
    case "computer":
        start = COMPUTER_START;
        end = modules.length;
        break;
    default:
        break;
    } 

    let html = '<select name="tasks" id="tasks">';
    modules.slice(start, end).forEach((data, idx) => {
        if (idx === 0) {
            html += `<option id="${idx + start}" value="${idx + start}">${data.name}</option>`;
        } else {
            html += `<option id="${idx + start}" value="${idx + start}" disabled>${data.name}</option>`;
        }
    });  
    html += "</select>";
    task_select.innerHTML = html;

    //ensure all complete options are set to green
    modules.slice(start, end).forEach((data, idx) => {
        set_button_color(data.name, idx + start, [start, end]);
    });

    tasks.addEventListener("change", (event) => {
        let idx = Number(event.target.value);
        let data = modules[idx];

        if (!data.draw_tables) {
            const rom_data = [
                "11110001",
                "11100010",
                "11010011",
                "11000100",

                "00000101",
                "00000000",
                "00000000",
                "00000000",

                "00000000",
                "00000000",
                "00000000",
                "00000000",

                "00000000", //expect this to be 3 + 2 - 1 = 4
                "00000001",
                "00000010",
                "00000011",
            ];
            rom_container.innerHTML = `<label id="rom_label" for="rom">ROM</label>
            <textarea id="rom" maxlength="128">${rom_data.join("")}</textarea>`;
            task_action.innerHTML = `
                <button id="step_btn">&#9654;&#9654;</button>
                <button id="rom_btn">&#9678;</button>
                <button id="reset_btn">&#11148;</button>
            `;

            step_btn.addEventListener("click", () => {
                assert(grci_instance.grci !== null);
                assert(grci_instance.module !== null);

                if (grci_instance.halt) return;


                cycle.innerHTML = `Clock Cycle: ${grci_instance.cycle}`;
                grci_instance.cycle++;

                assert(!grci_step_module(grci_instance.module));
                assert(grci_step_module(grci_instance.module));

                display_register(grci_instance.pc, pc);
                display_register(grci_instance.mar, mar);
                display_register(grci_instance.mdr, mdr);
                display_register(grci_instance.acc, acc);
                display_register(grci_instance.cir, cir);

                if (grci_get_output(grci_instance.module, 0) == 1) {
                    grci_instance.halt = true;
                    console.log("HALT");
                }

                let byte_string = "";
                for (let i = 0; i < 8 * 16; i++) {
                    let value = grci_get_state(grci_instance.ram, i);
                    byte_string += String(value);
                    if (byte_string.length == 8) {
                        let elem = document.getElementById(`ram${Math.floor(i / 8)}`);
                        elem.innerHTML = byte_string.split('').reverse().join('');
                        byte_string = "";
                    }
                }
            });

            rom_btn.addEventListener("click", () => {
                rom_btn.style.backgroundColor = "";
                load_grci_module();
                if (grci_instance.grci !== null) {
                    assert(grci_instance.module !== null);
                    grci_destroy_module(grci_instance.module);
                    grci_cleanup(grci_instance.grci);
                }

                grci_instance.halt = false;
                grci_instance.cycle = 0;

                grci_instance.grci = grci_easy_init();
                compile_modules_up_to_idx(grci_instance.grci, modules, idx);
                let code_textarea = document.getElementById("code");
                let code = new DOMParser().parseFromString(code_textarea.value, "text/html").body.textContent;
                const name = "Computer";
                let data = JSON.parse(localStorage.getItem(name));
                data.code = code;
                let result = grci_compile_src(grci_instance.grci, code, code.length);

                if (!result) {
                    grci_cleanup(grci_instance.grci);
                    grci_instance.grci = null;
                    rom_btn.style.backgroundColor = "red";
                    return;
                }

                
                grci_instance.module = grci_init_module(grci_instance.grci, name, name.length);
                grci_instance.ram = grci_submodule(grci_instance.module, "ram", 3);
                grci_instance.pc = grci_submodule(grci_instance.module, "pc", 2);
                grci_instance.mar = grci_submodule(grci_instance.module, "mar", 3);
                grci_instance.mdr = grci_submodule(grci_instance.module, "mdr", 3);
                grci_instance.acc = grci_submodule(grci_instance.module, "acc", 3);
                grci_instance.cir = grci_submodule(grci_instance.module, "cir", 3);

                if (grci_instance.ram === null || 
                    grci_instance.pc === null ||
                    grci_instance.mar === null ||
                    grci_instance.mdr === null ||
                    grci_instance.acc === null ||
                    grci_instance.cir === null) {

                    grci_cleanup(grci_instance.grci);
                    rom_btn.style.backgroundColor = "red";
                    return;
                }

                statusElement.innerHTML = "";

                let reversed_rom = "";
                let slice_idx = 0;
                while (rom.value.length < (16 * 8)) {
                    rom.value += "0";
                }
                let arr = rom.value.split("");
                arr.forEach((value, idx) => {
                    if (value !== "0" && value !== "1") {
                        arr[idx] = "0";
                    }
                });
                rom.value = arr.join("");
                while (slice_idx < rom.value.length) {
                    let s = rom.value.slice(slice_idx, slice_idx + 8);
                    reversed_rom += s.split("").reverse().join("");
                    slice_idx += 8;
                }
                for (let i = 0; i < 16 * 8; i++) {
                    grci_set_state(grci_instance.ram, i, Number(reversed_rom[i]));
                }

                console.log("Init module and store handle somewhere since we need access during step.  Load rom to ram.");
                console.log("run step button once (steps low and then high) to update ram");
                //set reset to 1
                grci_set_input(grci_instance.module, 0, 1);
                step_btn.click();
                grci_set_input(grci_instance.module, 0, 0);
                //set rest to 0
            });
        } else {
            task_action.innerHTML = `
                <button id="sim_btn">&#9654;</button>
                <button id="reset_btn">&#11148;</button>
            `;
            rom_container.innerHTML = "";
        }
        init_task(data.name, idx, data.test_cases, data.identifiers, data.default_code, data.draw_tables, [start, end], data.description, data.has_clk);
        set_button_color(data.name, idx, [start, end]);
    });
    tasks.dispatchEvent(new Event('change'));
});

clear_progress_btn.addEventListener("click", () => {
    localStorage.clear();
    lessons.dispatchEvent(new Event('change'));
});

lessons.dispatchEvent(new Event('change'));

