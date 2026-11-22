/*
TODO
  Need to fast-track integrating this into Tusker project - this is the main goal, so need to get there quickly
    prioritize this - automated tests are the most important right now <---------------focus on this

  Advanced features need to be finished, but not for a week or two.
     declaring functions/procedures
     calling functions/procedures
     files
     CHAR data type

  Stop button to stop current program - if the program is stopped at a prompt and the user tries to run again, it gives error
    have a button in terminal(?) kill the current programming
    this is tricky - should commit progress before trying to implement this in case we mess up

    Could try the Promise.race example from before (including await until current_program ends before starting new run),
      but also clear terminal during this time.  The uncleared terminal was maybe the reason the inputs didn't work last time!

    Promise.race does not stop main program from running, would need to have the race finisher set
      some flag that will tell the loop evaluating statements to exit (ie, throw an error)...

    Stopping programming is necessary - this is a major usability issue!!!

  Indent does not work
    Need to 

  Backspace should be possible while typing input into prompt up until the start of prompt location
    textarea.addEventListener("beforeinput", (e) => {
    if (e.inputType === "insertText") {
        console.log("Adding:", e.data);
    }
    });

      a       => e.data === "a"
      b       => e.data === "b"
      paste   => inputType === "insertFromPaste"
      delete  => inputType === "deleteContentBackward"

Write tests:
  arithmetic operators
  logical operators
  primitive types
  1d array types
  2d array types
  string types
  if
  case
  for
  while
  repeat

  Tests have a different runtime, ie, input/output are different
    run simply runs code
    test will return true/false based on results + expected resutls

  Advanced features
    Procedures
      Store in scope
      insert code at top to declare parameters
      insert code afterwards to assign parameters to arguments

    Functions
      Store in scope
      insert code at top to declare parameters
      insert code afterwards to assign parameters to arguments

    Files
      store files in-memory in a dictionary/map

    CHAR data type
      store internally as a string, but perform type-checking as necessary
      May want to merge all type checking into the Value class
        class Value {
          ...
          ensure_type(types) { //this throws error if the value type is not in the list of types

          }
        }

    Constants 
      CONSTANT HourlyRate <- 6.5
      Note: type is inferred rather than explicit
            declaration and assignment are merged
            value must be a literal

  Errors:
    index out of range (need to check index of each dimension)
    unexpected end of input (ie, user types LENGTH("CATS"), which is invalid)
*/


function tokenize(input) {
  const tokens = [];
  let pos = 0;

  const KEYWORDS = new Set([
      "IF", "THEN", "ELSE", "ENDIF",
      "CASE", "OTHERWISE", "ENDCASE",
      "FOR", "TO", "NEXT",
      "WHILE", "ENDWHILE", "DO",
      "REPEAT", "UNTIL",
      "DECLARE", "ARRAY", "OF",
      "PROCEDURE", "ENDPROCEDURE",
      "FUNCTION", "ENDFUNCTION",
      "RETURN",
      "INPUT", "OUTPUT",
      "AND", "OR", "NOT",

      "INTEGER", "REAL", "BOOLEAN"
  ]);

  while (pos < input.length) {
    const ch = input[pos];

    // whitespace
    if (/\s/.test(ch)) {
      pos++;
      continue;
    }

    // string literal
    if (ch === '"') {
      let start = ++pos;

      while (pos < input.length && input[pos] !== '"') {
        pos++;
      }

      tokens.push({
  type: "STRING",
  value: input.slice(start, pos)
  });

  pos++; // closing quote
  continue;
  }

  // number
  if (/\d/.test(ch)) {
    let start = pos;

    while (/\d/.test(input[pos])) {
      pos++;
    }

    if (input[pos] === '.') {
      pos++;

      while (/\d/.test(input[pos])) {
        pos++;
      }
    }

    let s = input.slice(start, pos);
    tokens.push({type: "NUMBER", value: input.slice(start, pos)});

    continue;
  }

  // identifier or keyword
  if (/[A-Za-z_]/.test(ch)) {
    let start = pos;

    while (/[A-Za-z0-9_]/.test(input[pos])) {
      pos++;
    }

    let word = input.slice(start, pos);
    let upper = word.toUpperCase();

    tokens.push({
  type: KEYWORDS.has(upper)
  ? "KEYWORD"
  : "IDENTIFIER",
  value: word
  });

  continue;
  }

  // two-character operators
  const two = input.slice(pos, pos + 2);

  if (two === "//") {
      while (pos < input.length && input[pos] !== '\n') {
        pos++;
      }
      pos++; //newline
      continue;
  }

  if (["<=", ">=", "<>"].includes(two)) {
    tokens.push({ type: "OPERATOR", value: two });



    pos += 2;
    continue;
  }

  // single-character operators
  if ("+-*/=<>()[],:^".includes(ch)) {
    tokens.push({
  type: "OPERATOR",
  value: ch
  });

  pos++;
  continue;
  }

  throw new Error(
      `Unexpected character '${ch}' at position ${pos}`
      );
  }

  return tokens;
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  current() {
    return this.tokens[this.pos];
  }

  eof() {
    return this.pos >= this.tokens.length;
  }

  advance() {
    return this.tokens[this.pos++];
  }

  expect(type, value = null) {
    const token = this.current();

    if (!token) {
      throw new Error("Unexpected end of input");
    }

    if (value !== null && token.value !== value) {
      throw new Error(
          `Expected '${value}', got '${token.value}'`
          );
    }

    if (token.type !== type) {
      throw new Error(
          `Expected ${type}, got ${token.type}`
          );
    }

    this.pos++;
    return token;
  }

  parseProgram() {
    const statements = [];

    while (!this.eof()) {
      statements.push(this.parseStatement());
    }

    return statements;
  }

  parseStatement() {
    const token = this.current();

    if (token.type === "KEYWORD") {
      switch (token.value) {
        case "OUTPUT":
          return this.parseOutput();
        case "INPUT":
          return this.parseInput();
        case "IF":
          return this.parseIf();
        case "DECLARE":
          return this.parseDeclaration();
        case "WHILE":
          return this.parseWhile();
        case "REPEAT":
          return this.parseRepeat();
        case "FOR":
          return this.parseFor();
        case "CASE":
          return this.parseCase();
      }
    }

    if (token.type === "IDENTIFIER") {
      return this.parseAssignment();
    }

    throw new Error(
        `Unexpected statement '${token.value}'`
        );
  }

  parseExprSequence() {
    let exprs = [];

    exprs.push(this.parseExpression());

    while (this.current() && 
           this.current().type === "OPERATOR" && 
           this.current().value === ",") {

      this.expect("OPERATOR", ",");
      exprs.push(this.parseExpression());
    }

    return exprs;
  }

  parseOutput() {
    this.expect("KEYWORD", "OUTPUT");
    return {
        type: "Output",
        sequence: this.parseExprSequence()
    };
  }

  parseInput() {
    this.expect("KEYWORD", "INPUT");

    return {
        type: "Input",
        identifier: this.parseExpression()
    };
  }

  parseIf() {
    this.expect("KEYWORD", "IF");

    const condition = this.parseExpression();

    this.expect("KEYWORD", "THEN");

    const body = [];

    while (!this.eof() && 
           this.current().value !== "ENDIF" &&
           this.current().value != "ELSE") {
      body.push(this.parseStatement());
    }

    if (this.current().value === "ENDIF") {
      this.expect("KEYWORD", "ENDIF");
      return { type: "If",
               condition,
               body };
    }

    this.expect("KEYWORD", "ELSE");

    const else_body = [];

    while (!this.eof() && 
           this.current().value !== "ENDIF") {
      else_body.push(this.parseStatement());
    }

    this.expect("KEYWORD", "ENDIF");

    return { type: "If",
             condition,
             body,
             else_body };
  }

  is_literal(token) {
    switch (token.type) {
      case "NUMBER":
      case "STRING":
      case "CHAR":
        return true;
      case "IDENTIFIER":
        if (token.value === "TRUE" || token.value === "FALSE") return true;
    }
    return false;
  }

  parseCase() {
    this.expect("KEYWORD", "CASE");
    this.expect("KEYWORD", "OF");
    
    const expr = this.parseExpression();

    let cases = [];

    while (!this.eof() && this.current().value !== "ENDCASE") {
      if (this.current().value === "OTHERWISE") {
        const token = this.current();
        this.expect("KEYWORD", "OTHERWISE");
        this.expect("OPERATOR", ":");
        const stmts = [];
        while (!this.eof() && this.current().value !== "ENDCASE") {
          stmts.push(this.parseStatement());
        }
        cases.push({ expr, stmts }); //otherwise will always match expr
        break;
      }

      const token = this.current();
      const literal = this.parseExpression();
      if (!this.is_literal(token)) {
        throw new Error("Each case must be a literal (STRING, INTEGER, CHAR or BOOLEAN)");
      }
      this.expect("OPERATOR", ":");

      const stmts = [];
      while (!this.eof() && 
             this.current().value !== "ENDCASE" &&
             this.current().value !== "OTHERWISE" &&
             !this.is_literal(this.current())) {

        stmts.push(this.parseStatement());
      }
      cases.push({ expr: literal, stmts });
    }

    this.expect("KEYWORD", "ENDCASE");
    
    return { type: "Case", expr, cases };
  }

  parseFor() {
    this.expect("KEYWORD", "FOR");

    const init_stmt = this.parseStatement();
    if (init_stmt.type != "Assignment") {
      throw new Error("Iteration variable must be assigned to value"); 
    }

    this.expect("KEYWORD", "TO");
    const end_expr = this.parseExpression();
    
    const body = [];

    while (!this.eof() && 
           this.current().value !== "NEXT") {
      body.push(this.parseStatement());
    }

    this.expect("KEYWORD", "NEXT");

    const iter_var = this.parseExpression();

    if (init_stmt.identifier.name !== iter_var.name) {
      throw new Error("Iteration variable after FOR and after NEXT must match");
    }

    const increment_code = `${iter_var.name} <- ${iter_var.name} + 1`;
    const tokens = tokenize(increment_code);
    const parser = new Parser(tokens);
    const increment_stmt = parser.parseProgram()[0];

    return { type: "For",
             init_stmt,
             end_expr,
             body,
             increment_stmt };
  }

  parseRepeat() {
    this.expect("KEYWORD", "REPEAT");

    const body = [];

    while (!this.eof() && 
           this.current().value !== "UNTIL") {
      body.push(this.parseStatement());
    }

    this.expect("KEYWORD", "UNTIL");

    const condition = this.parseExpression();

    return { type: "Repeat",
             condition,
             body };
  }

  parseWhile() {
    this.expect("KEYWORD", "WHILE");

    const condition = this.parseExpression();

    this.expect("KEYWORD", "DO");

    const body = [];

    while (!this.eof() && 
           this.current().value !== "ENDWHILE") {
      body.push(this.parseStatement());
    }

    this.expect("KEYWORD", "ENDWHILE");
    return { type: "While",
             condition,
             body };
  }

  parseRange() {
    const start_idx = this.advance().value;
    this.expect("OPERATOR", ":")
    const end_idx = this.advance().value;

    const i0 = parseInt(start_idx, 10);
    if (i0 !== 1) 
      throw new Error(`Starting array index must be 1`);
    const i1 = parseInt(end_idx, 10);
    if (Number.isNaN(i1) || i1 < 1) 
      throw new Error(`Ending array index must be 1 or larger`);

    return i1 - i0 + 1;
  }

  parseRangeSequence() {
    let dims = [this.parseRange()];

    while (this.current() &&
           this.current().type === "OPERATOR" &&
           this.current().value === ",") {
      this.expect("OPERATOR", ",");
      dims.push(this.parseRange()); 
    }

    return dims;
  }

  parseDataType() {
    if (this.current() && this.current().value === "ARRAY") {
      this.expect("KEYWORD", "ARRAY");
      this.expect("OPERATOR", "[")

      let dims = this.parseRangeSequence();

      this.expect("OPERATOR", "]")
      this.expect("KEYWORD", "OF");
      const element_type = this.advance().value;

      return new ArrayType(element_type, dims);
    }

    return new PrimitiveType(this.advance().value);
  }

  parseDeclaration() {
    this.expect("KEYWORD", "DECLARE");
    const variable = this.parseExpression();
    this.expect("OPERATOR", ":");
    const data_type = this.parseDataType();
   
    return { type: "Declaration", 
             identifier: variable, 
             data_type } 
  }

  parseAssignment() {
    const variable = this.parsePrimary();
    this.expect("OPERATOR", "<");
    this.expect("OPERATOR", "-");
    return { type: "Assignment", 
             identifier: variable, 
             expr: this.parseExpression() } 
  }

  parseExpression() {
    return this.parseOr();
  }

  parseOr() {
      let left = this.parseAnd();

      while (
          this.current() &&
          this.current().type === "KEYWORD" && 
          this.current().value === "OR") {

          const op = this.advance().value;
          const right = this.parseAnd();

          left = {
              type: "Binary",
              operator: op,
              left,
              right
          };
      }

      return left;
  }

  parseAnd() {
      let left = this.parseNot();

      while (
          this.current() &&
          this.current().type === "KEYWORD" && 
          this.current().value === "AND") {

          const op = this.advance().value;
          const right = this.parseNot();

          left = {
              type: "Binary",
              operator: op,
              left,
              right
          };
      }

      return left;
  }

  parseNot() {
    const token = this.current();

    if (token.type === "KEYWORD" && token.value === "NOT") {
      const operator = this.advance().value;
      return { type: "Not", operator, expr: this.parseNot() };
    }

    return this.parseComparison();
  }

  parseComparison() {
    let left = this.parseAdditive();

    while (
        this.current() &&
        this.current().type === "OPERATOR" &&
        ["=", "<>", "<", ">", "<=", ">="]
        .includes(this.current().value)
        ) {
      const op = this.advance().value;

      const right = this.parseAdditive();

      left = {
type: "Binary",
      operator: op,
      left,
      right
      };
    }

    return left;
  }

  parseAdditive() {
      let left = this.parseMultiplicative();

      while (
          this.current() &&
          this.current().type === "OPERATOR" &&
          ["+", "-"].includes(this.current().value)
      ) {
          const op = this.advance().value;
          const right = this.parseMultiplicative();

          left = {
              type: "Binary",
              operator: op,
              left,
              right
          };
      }

      return left;
  }

  parseMultiplicative() {
      let left = this.parseNegation();

      while (
          this.current() &&
          this.current().type === "OPERATOR" &&
          ["*", "/", "^"].includes(this.current().value) //^ precedence is not defined clearly in IGCSE CS Pseudocode, so just making it left-associative and same precedence as * and /
      ) {
          const op = this.advance().value;
          const right = this.parseNegation();

          left = {
              type: "Binary",
              operator: op,
              left,
              right
          };
      }

      return left;
  }

  parseNegation() {
    const token = this.current();

    if (token.type === "OPERATOR" && token.value === "-") {
      const operator = this.advance().value;
      return { type: "Negation", operator, expr: this.parseNegation() };
    }

    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.current();

    if (token.type === "OPERATOR" && token.value === "(") {
        this.advance();

        const expr = this.parseExpression();

        this.expect("OPERATOR", ")");

        return expr;
    }

    if (token.type === "NUMBER") {
      this.advance();

      return {
type: "Number",
        value: Number(token.value)
      };
    }

    if (token.type === "STRING") {
      this.advance();

      return {
type: "String",
        value: token.value
      };
    }

    if (token.type === "IDENTIFIER") {
      this.advance();

      if (this.current() &&
          this.current().type === "OPERATOR" &&
          this.current().value === "[") {
   
        this.expect("OPERATOR", "["); 
        const indices = this.parseExprSequence();
        this.expect("OPERATOR", "]"); 
         
        return {
          type: "Identifier",
          name: token.value,
          indices
        };

      } else if (!this.eof() && 
                 this.current().type === "OPERATOR" && 
                 this.current().value === "(") {
        this.expect("OPERATOR", "(");
        let args = [];
        if (this.current().type === "OPERATOR" && this.current().value === ")") {
          this.expect("OPERATOR", ")");
          
          return {
            type: "FcnCall",
            name: token.value,
            args: []
          };
        }

        args = this.parseExprSequence();

        this.expect("OPERATOR", ")");
        
        return {
          type: "FcnCall",
          name: token.value,
          args
        };
      } else {
        return {
          type: "Identifier",
          name: token.value
        };
      }
    }

    throw new Error(`Unexpected token '${token.value}'`);
  }
}


class Value {
  constructor(value, type) {
    this.value = value;
    this.type = type;
  }

  is_type(type) {
    return this.type.type === type;
  }
}

class PrimitiveType {
  constructor(type) {
    this.type = type;
  }
}

class ArrayType {
  constructor(subtype, dims) {
    this.type = "ARRAY";
    this.subtype = subtype;
    this.dims = dims;
  }
}

function variable_declare(scope, name, data_type) {
  if (name in scope) 
    throw new Error(`Identifier ${name} already declared`);

  switch (data_type.type) {
    case "INTEGER":
      scope[name] = new Value(0, data_type);
      break;
    case "REAL":
      scope[name] = new Value(0.0, data_type);
      break;
    case "BOOLEAN":
      scope[name] = new Value(false, data_type);
      break;
    case "STRING":
      scope[name] = new Value("", data_type);
      break;
    case "ARRAY":
      let default_value = 0;
      switch (data_type.subtype) {
        case "INTEGER": dafault_value = 0; break;
        case "REAL": dafault_value = 0.0; break;
        case "BOOLEAN": dafault_value = false; break;
        case "STRING": dafault_value = ""; break;
        default:
          throw new Error(`Unexpected array element type ${data_type.subtype}`);
      }
      let cap = data_type.dims.reduce((acc, x) => acc * x, 1);
      scope[name] = new Value(Array(cap).fill(default_value), data_type);
      break;
    default:
      throw new Error(`Unexpected data type ${data_type.type}`);
      break;
  }
}

function cast_to_type(value, type) {
  switch (type) {
    case "INTEGER": {
      value = parseInt(value, 10);
      if (Number.isNaN(value)) {
        throw new Error(`Value cannot be converted into an INTEGER`);
      } 
      return value;
    }
    case "REAL": {
      value = parseFloat(value, 10);
      if (Number.isNaN(value)) {
        throw new Error(`Value cannot be converted into a REAL`);
      } 
      return value;
    }
    case "BOOLEAN": {
      value = Boolean(value);
      if (value !== true && value !== false) {
        throw new Error(`Value cannot be converted into a BOOLEAN`);
      }
      return value;
    }
    case "STRING": {
      value = String(value);
      if (typeof value !== "string") {
        throw new Error(`Value cannot be converted into a STRING`);
      }
      return value;
    }
    default:
      throw new Error(`Invalid data type`);
  }
}

function variable_get(scope, name, indices) {
  if (!(name in scope)) 
    throw new Error(`Identifier ${name} not declared`);
  if (indices !== undefined) {
      let dims = scope[name].type.dims;
      let offset = 0;
      dims.forEach((dim, i) => {
        let later_dims = dims.slice(i + 1);
        let product_of_later_dims = later_dims.reduce((acc, x) => acc * x, 1);
        offset += indices[i] * product_of_later_dims;
      });
      return new Value(scope[name].value[offset], new PrimitiveType(scope[name].type.subtype));
  }
  return scope[name];
}

function variable_set(scope, name, value, indices) {
    if (!(name in scope)) 
      throw new Error(`Identifier ${name} not declared`);

    if (scope[name].type.type !== "ARRAY") {
      scope[name].value = cast_to_type(value, scope[name].type.type);
      return;
    }


    if (indices === undefined) {
      throw new Error(`Indices must be provided for array assignment`);
    }
    let dims = scope[name].type.dims;
    let offset = 0;
    dims.forEach((dim, i) => {
      let later_dims = dims.slice(i + 1);
      let product_of_later_dims = later_dims.reduce((acc, x) => acc * x, 1);
      offset += indices[i] * (product_of_later_dims);
    });
    scope[name].value[offset] = cast_to_type(value, scope[name].type.subtype);

}

async function evaluate(node, scope, runtime) {
  switch (node.type) {

    case "Number":
      if (String(node.value).includes("."))
        return new Value(node.value, new PrimitiveType("REAL")); //REAL to keep precision, assignment will cast to INTEGER if necessary

      return new Value(node.value, new PrimitiveType("INTEGER"));

    case "String":
      return new Value(node.value, new PrimitiveType("STRING"));

    case "Identifier": {
      if (node.indices === undefined) {
        return variable_get(scope, node.name);
      }
      let indices = await Promise.all(node.indices.map(expr => evaluate(expr, scope, runtime)));
      indices = indices.map((value) => value.value);
      return variable_get(scope, node.name, indices);
    }
    case "Binary": {
                     const left_side = await evaluate(node.left, scope, runtime);
                     const right_side = await evaluate(node.right, scope, runtime);
                     const left = left_side.value;
                     const right = right_side.value;
  

                     let result_type = undefined;
                     if (["=", "<>", "<", ">", "<=", ">-", "AND", "OR"].includes(node.operator)) {
                      result_type = new PrimitiveType("BOOLEAN");
                     } else {
                      if (node.operator !== "/" && left_side.is_type("INTEGER") && right_side.is_type("INTEGER")) {
                        result_type = new PrimitiveType("INTEGER");
                      } else {
                        result_type = new PrimitiveType("REAL");
                      }
                     }

                     switch (node.operator) {
                       case "+": return new Value(left + right,   result_type); 
                       case "-": return new Value(left - right,   result_type); 
                       case "*": return new Value(left * right,   result_type); 
                       case "/": return new Value(left / right,   result_type); 
                       case "^": return new Value(left ** right,   result_type); 
                       case "=": return  new Value(left === right,result_type); 
                       case "<>": return new Value(left !== right,result_type); 
                       case "<": return  new Value(left < right,  result_type); 
                       case ">": return  new Value(left > right,  result_type); 
                       case "<=": return new Value(left <= right, result_type); 
                       case ">=": return new Value(left >= right, result_type); 
                       case "AND": return new Value(left && right,result_type); 
                       case "OR": return new Value(left || right, result_type); 
                     }
                   }

    case "Negation": {
      const value = await evaluate(node.expr, scope, runtime);
      if (node.operator === "-") return new Value(-value.value, value.type);
      break;
    }
    case "Not": {
      const value = await evaluate(node.expr, scope, runtime);
      if (node.operator === "NOT") return new Value(!value.value, value.type);
      break;
    }
    case "Output":
       for (const expr of node.sequence) {
         let value = await evaluate(expr, scope, runtime);
         runtime.output(value, "");
       }
       runtime.output(new Value("", new PrimitiveType("STRING")));
       break;

    case "Input": {
      let value = await runtime.input();
      //variable_set(scope, node.identifier.name, value);

      if (node.identifier.indices === undefined) {
        variable_set(scope, node.identifier.name, value);
        return;
      }

      let indices = await Promise.all(node.identifier.indices.map(expr => evaluate(expr, scope, runtime)));
      indices = indices.map((value) => value.value);
      variable_set(scope, node.identifier.name, value, indices);
       break;
    }
    case "If": {
      let cond = await evaluate(node.condition, scope, runtime);
      if (cond.value) {
        for (const stmt of node.body) {
          await evaluate(stmt, scope, runtime);
        }
      } else if (node.else_body) {
        for (const stmt of node.else_body) {
          await evaluate(stmt, scope, runtime);
        }
      }
      break;
    }
    case "Case": {
      let left = await evaluate(node.expr, scope, runtime);
      for (const c of node.cases) {
        let right = await evaluate(c.expr, scope, runtime);
        if (left.value !== right.value) continue;

        for (const stmt of c.stmts) {
          await evaluate(stmt, scope, runtime);
        }
        break;
      }
      break;
    }
    case "For": {
      await evaluate(node.init_stmt, scope, runtime);

      while (true) {
        //break if iteration variable is greater than end_expr
        let value = await evaluate(node.end_expr, scope, runtime);
        let iter_var = variable_get(scope, node.init_stmt.identifier.name);
        if (iter_var.value > value.value) break; 

        for (const stmt of node.body) {
          await evaluate(stmt, scope, runtime);
        }
       
        await evaluate(node.increment_stmt, scope, runtime); 
      }
      break;
    }
    case "Repeat": {
      while (true) {
        for (const stmt of node.body) {
          await evaluate(stmt, scope, runtime);
        }

        let cond = await evaluate(node.condition, scope, runtime);
        if (cond.value) break;
      }
      break;
    }
    case "While": {
      while (true) {
        let cond = await evaluate(node.condition, scope, runtime);
        if (!cond.value) break;
        for (const stmt of node.body) {
          await evaluate(stmt, scope, runtime);
        }
      }
      break;
    }
    case "Declaration":
      variable_declare(scope, node.identifier.name, node.data_type);
      break;

    case "Assignment": {
      let right = await evaluate(node.expr, scope, runtime);
      if (node.identifier.indices === undefined) {
        variable_set(scope, node.identifier.name, right.value);
        return;
      }

      let indices = await Promise.all(node.identifier.indices.map(expr => evaluate(expr, scope, runtime)));
      indices = indices.map((value) => value.value);
      variable_set(scope, node.identifier.name, right.value, indices);
      break;
    }
    case "FcnCall": {
      //TODO only using prebuilt functions for now
      //User defined functions should be stored in scope
      switch (node.name) {
        case "MOD": {
          if (node.args.length !== 2) {
            throw new Error(`MOD must be called with 2 arguments`);
          }
          const arg0 = await evaluate(node.args[0], scope, runtime);
          const arg1 = await evaluate(node.args[1], scope, runtime);

          if (!arg0.is_type("INTEGER") && !arg0.is_type("REAL")) throw new Error("MOD argument 1 must be INTEGER or REAL");
          if (!arg1.is_type("INTEGER") && !arg1.is_type("REAL")) throw new Error("MOD argument 2 must be INTEGER or REAL");

          const result_type = arg0.is_type("INTEGER") && arg1.is_type("INTEGER") ? new PrimitiveType("INTEGER") : new PrimitiveType("REAL");
          return new Value(arg0.value % arg1.value, result_type); 
        }
        case "DIV": {
          if (node.args.length !== 2) {
            throw new Error(`DIV must be called with 2 arguments`);
          }
          const arg0 = await evaluate(node.args[0], scope, runtime);
          const arg1 = await evaluate(node.args[1], scope, runtime);

          if (!arg0.is_type("INTEGER") && !arg0.is_type("REAL")) throw new Error("DIV argument 1 must be INTEGER or REAL");
          if (!arg1.is_type("INTEGER") && !arg1.is_type("REAL")) throw new Error("DIV argument 2 must be INTEGER or REAL");

          const result_type = arg0.is_type("INTEGER") && arg1.is_type("INTEGER") ? new PrimitiveType("INTEGER") : new PrimitiveType("REAL");
          return new Value(Math.floor(arg0.value / arg1.value), result_type); 
        }
        case "ROUND": {
          if (node.args.length !== 2) {
            throw new Error(`ROUND must be called with 2 arguments`);
          }

          const arg0 = await evaluate(node.args[0], scope, runtime);
          const arg1 = await evaluate(node.args[1], scope, runtime);

          if (!arg0.is_type("INTEGER") && !arg0.is_type("REAL")) throw new Error("ROUND argument 1 must be INTEGER or REAL");
          if (!arg1.is_type("INTEGER")) throw new Error("ROUND argument 2 must be INTEGER");

          const result_type = arg1.value === 0 ? new PrimitiveType("INTEGER") : new PrimitiveType("REAL");
          return new Value(Number(arg0.value.toFixed(arg1.value)), result_type); 
        }
        case "RANDOM": {
          if (node.args.length !== 0) {
            throw new Error(`RANDOM must be called with 0 arguments`);
          }

          return new Value(Math.random(), new PrimitiveType("REAL"));
        }
        case "LENGTH": {
          if (node.args.length !== 1) {
            throw new Error(`LENGTH must be called with 1 argument`);
          }

          const arg0 = await evaluate(node.args[0], scope, runtime);

          if (!arg0.is_type("STRING")) throw new Error("LENGTH argument 1 must be STRING");

          return new Value(arg0.value.length, new PrimitiveType("INTEGER"));
        }
        case "UCASE": {
          if (node.args.length !== 1) {
            throw new Error(`UCASE must be called with 1 argument`);
          }

          const arg0 = await evaluate(node.args[0], scope, runtime);

          if (!arg0.is_type("STRING")) throw new Error("LENGTH argument 1 must be STRING");

          return new Value(arg0.value.toUpperCase(), new PrimitiveType("STRING"));
        }
        case "LCASE": {
          if (node.args.length !== 1) {
            throw new Error(`LCASE must be called with 1 argument`);
          }

          const arg0 = await evaluate(node.args[0], scope, runtime);

          if (!arg0.is_type("STRING")) throw new Error("LENGTH argument 1 must be STRING");

          return new Value(arg0.value.toLowerCase(), new PrimitiveType("STRING"));
        }
        case "SUBSTRING": {
          if (node.args.length !== 3) {
            throw new Error(`SUBSTRING must be called with 3 argument`);
          }

          const arg0 = await evaluate(node.args[0], scope, runtime);
          const arg1 = await evaluate(node.args[1], scope, runtime);
          const arg2 = await evaluate(node.args[2], scope, runtime);

          if (!arg0.is_type("STRING")) throw new Error("SUBSTRING argument 1 must be STRING");
          if (!arg1.is_type("INTEGER")) throw new Error("SUBSTRING argument 2 must be INTEGER");
          if (!arg2.is_type("INTEGER")) throw new Error("SUBSTRING argument 3 must be INTEGER");

          if (arg1.value < 1) throw new Error("SUBSTRING argument 2 must be larger than 0");
          if (arg1.value > arg0.value.length) throw new Error("SUBSTRING argument 2 cannot be larger than argument 1 length");
          if (arg2.value < 1) throw new Error("SUBSTRING argument 3 must be larger than 0");
          if (arg1.value + arg2.value - 1 > arg0.value.length) throw new Error("SUBSTRING argument 3 results in a substring extending beyond argument 1 length");

          return new Value(arg0.value.substring(arg1.value - 1, arg1.value - 1 + arg2.value), new PrimitiveType("STRING"));
        }
        default:
          throw new Error(`Unexpected function name ${node.name}`);
      }
      break;
    }
    default:
      throw new Error(`Unexpected statement type ${node.type}`);
      break;
  }
}

const textArea = document.getElementById("userInput");

function moveToEnd() {
    requestAnimationFrame(() => {
        const len = textArea.value.length;
        textArea.setSelectionRange(len, len);
    });
}

textArea.addEventListener("click", moveToEnd);
textArea.addEventListener("keydown", moveToEnd);
textArea.addEventListener("mouseup", moveToEnd);

textArea.addEventListener("keydown", (event) => {
    if (event.key === "Backspace") {
        event.preventDefault();
    }
});


code.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
        e.preventDefault();

        const ta = e.target;
        ta.setRangeText(
            "    ",
            ta.selectionStart,
            ta.selectionEnd,
            "end"
        );
    }
});

moveToEnd();

async function run(code, runtime) {
/*
  DECLARE x: ARRAY[1:3] OF INTEGER
  x[1] <- 9
  x[2] <- -4
  x[3] <- 5
  
  OUTPUT x[1], x[2], x[3]
  OUTPUT x[1] + x[2] + x[3]


*/
/*
const code = `

  DECLARE Rainfall : ARRAY[1:3] OF REAL
  DECLARE Index : INTEGER
  DECLARE TotalRain : REAL
  DECLARE AverageRain : REAL
  DECLARE NoRain : INTEGER
  DECLARE DryDays : INTEGER
  DECLARE MaxDryDays : INTEGER

  FOR Index <- 1 TO 3
    Rainfall[Index] <- 0
  NEXT Index

  FOR Index <- 1 TO 3
    OUTPUT "Input the rainfall for measurement for day ", Index
    INPUT Rainfall[Index]
  NEXT Index

  TotalRain <- 0
  FOR Index <- 1 TO 3
    TotalRain <- TotalRain + Rainfall[Index]
  NEXT Index

  AverageRain <- ROUND(TotalRain / 3, 4)
  TotalRain <- ROUND(TotalRain / 10, 2)
  
  NoRain <- 0
  FOR Index <- 1 TO 3
    IF Rainfall[Index] = 0
      THEN
        NoRain <- NoRain + 1
    ENDIF
  NEXT Index

  IF NoRain > 0
    THEN
      MaxDryDays <- 1
      DryDays <- 1
      FOR Index <- 1 TO 2
        IF Rainfall[Index] = 0 AND Rainfall[Index + 1] = 0
          THEN
            DryDays <- DryDays + 1
            IF DryDays > MaxDryDays
              THEN
                MaxDryDays <- DryDays
            ENDIF
          ELSE
            DryDays <- 1
        ENDIF
      NEXT Index
    ELSE
      MaxDryDays <- 0
      DryDays <- 0
  ENDIF

  OUTPUT "The total rainfall for the year was ", TotalRain, " cm" 
  OUTPUT "The average daily rainfall was ", AverageRain, " mm" 
  OUTPUT "The total number of days with no rainfall was ", NoRain, "day(s)" 
  OUTPUT "The longest period with no rainfall was ", MaxDryDays, "day(s)" 
   
  IF MaxDryDays >= 15 
    THEN 
      OUTPUT "" 
      OUTPUT "There was a drought this year because the longest period with no rainfall was 15 days or longer" 
    ELSE 
      OUTPUT "" 
      OUTPUT "There was no drought this year, because the longest period with no rainfall was shorter than 15 days" 
  ENDIF
`;
*/
/*
  //loops
  DECLARE x: INTEGER
  x <- 0
  WHILE x < 10 DO
    x <- x + 1
    OUTPUT x
  ENDWHILE

  REPEAT
    x <- x - 1
    OUTPUT x
  UNTIL x = 0

  DECLARE x: INTEGER
  FOR x <- 0 TO 5
    OUTPUT x * 2
  NEXT x

  OUTPUT "END"

  //if/else
  DECLARE x: INTEGER
  x <- 10
  OUTPUT "A"
  IF x < 15 THEN
    OUTPUT "OK"
  ENDIF

  IF x > 15 THEN
    OUTPUT "X"
  ELSE
    OUTPUT "Y"
  ENDIF

  OUTPUT "END"
  //2d arrays
  DECLARE x: ARRAY[1:2, 1:3] OF INTEGER
  x[1, 1] <- 1
  x[1, 2] <- 2
  x[1, 3] <- 3

  x[2, 1] <- 4
  x[2, 2] <- 5
  x[2, 3] <- 6

  //1d array test
  DECLARE x: ARRAY[1:3] OF INTEGER
  DECLARE y: ARRAY[1:3] OF REAL
  DECLARE z: ARRAY[1:2] OF BOOLEAN
  DECLARE w: ARRAY[1:3] OF STRING
  x[1] <- 9
  x[2] <- -4
  x[3] <- 5

  OUTPUT x[1], x[2], x[3]
  OUTPUT x[1] + x[2] + x[3]

  y[3] <- 3.0
  y[1] <- 1.0
  y[2] <- 2.0

  OUTPUT y[3] + y[2] - y[1]

  z[1] <- TRUE
  z[2] <- FALSE
  OUTPUT z[1] AND z[2], z[1] OR z[2], NOT z[1], NOT z[2]

  //data type test (primitive data types + operator precedence test)
  OUTPUT 1 + 2
  OUTPUT 
  //variable test
  DECLARE x: INTEGER
  DECLARE y: INTEGER
  DECLARE z: INTEGER

  x <- 10
  y <- -30 -- 5
  z <- x + y
  OUTPUT x
  OUTPUT y
  OUTPUT z

  DECLARE a: BOOLEAN
  DECLARE b: BOOLEAN
  DECLARE c: BOOLEAN
  DECLARE d: BOOLEAN

  a <- TRUE OR TRUE
  b <- TRUE OR FALSE
  c <- TRUE OR TRUE AND FALSE
  d <- FALSE OR TRUE AND TRUE
  OUTPUT a, 1 + 3
  OUTPUT b, 99 - 11, "CAt"
  OUTPUT c
  OUTPUT d
  OUTPUT "Enter an animal:", "ad", "dfaf"

  //array test
 */

  let ast = {}
  const tokens = tokenize(code);
  console.log(tokens);
  const parser = new Parser(tokens);
  ast = parser.parseProgram();
  console.log(ast);
  let global_scope = { 
                        "TRUE": { type: new PrimitiveType("BOOLEAN"), value: true},  
                        "FALSE": { type: new PrimitiveType("BOOLEAN"), value: false},  
                     };
  for (const stmt of ast) {
      await evaluate(stmt, global_scope, runtime);
  }
}

const runtime = {
  input() {

    textArea.focus();
    textArea.value += "> ";

    return new Promise(resolve => {

        //const button = document.getElementById("submitBtn");

        function handler(event) {
          if (event.key === "Enter") {
            event.preventDefault();
            const idx = textArea.value.lastIndexOf("\n"); //TODO this will give -1 if first line - bug
            resolve(textArea.value.substring(idx + 3));
            textArea.removeEventListener("keydown", handler);
            textArea.value += "\n";
            textArea.scrollTop = textArea.scrollHeight;
          }
        }

        textArea.addEventListener("keydown", handler);
    });
  },

  output(value, eol="\n") {
    textArea.focus();
    if (value.value === true) {
      textArea.value += "TRUE" + eol;
    } else if (value.value === false) {
      textArea.value += "FALSE" + eol;
    } else if (value.type.type === "REAL") {
      textArea.value += String(value.value) + eol;
    } else {
      textArea.value += String(value.value) + eol;
    }

    textArea.scrollTop = textArea.scrollHeight;

  }
};

submitBtn.addEventListener("click", function() {
  run(code.value + " ", runtime).catch(err => {
      runtime.output(new Value("[ERROR]: " + err.message, "STRING"));
      console.error(err);
  });
});

clearBtn.addEventListener("click", function() {
  userInput.value = "";
});

textArea.addEventListener("keydown", e => {
});

/*
resetBtn.addEventListener("click", function() {
  code.value = "";
});
*/
