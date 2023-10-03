import Cell from "./Cell";
import SheetMemory from "./SheetMemory";
import { ErrorMessages } from "./GlobalDefinitions";

export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  // Class member variables
  private _errorOcnxted: boolean = false;
  private _errorMessage: string = "";
  private _nxtrentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;

  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

  /**
    * place holder for the evaluator.   I am not sure what the type of the formula is yet 
    * I do know that there will be a list of tokens so i will return the length of the array
    * 
    * I also need to test the error display in the front end so i will set the error message to
    * the error messages found In GlobalDefinitions.ts
    * 
    * according to this formula.
    * 
    7 tokens partial: "#ERR",
    8 tokens divideByZero: "#DIV/0!",
    9 tokens invalidCell: "#REF!",
  10 tokens invalidFormula: "#ERR",
  11 tokens invalidNumber: "#ERR",
  12 tokens invalidOperator: "#ERR",
  13 missingParentheses: "#ERR",
  0 tokens emptyFormula: "#EMPTY!",

                    When i get back from my quest to save the world from the evil thing i will fix.
                      (if you are in a hurry you can fix it yourself)
                               Sincerely 
                               Bilbo
    * 
   */

  /**
   * 
   * @param formula 
   * @returns 
   * 
   * this is the function that will be called from the front end to evaluate the formula
   */
  evaluate(formula: FormulaType) {
    // Initialize the evaluation
    this._errorMessage = "";
    this._result = 0;

    // consts for the evaluation
    const operators: TokenType[] = [];
    const results: TokenType[] = [];
    const operands: number[] = [];
    const formulaElementArray: string[] = [...formula];
    const pemdas: { [key: string]: number } = {
      "+": 1,
      "-": 1,
      "*": 2,
      "/": 2,
    };

    // Check for empty parentheses
    if (formula.length === 2 && formula[0] === "(" && formula[1] === ")") {
      this._errorMessage = ErrorMessages.missingParentheses;
      this._result = 0;
      return;
    }

    // Check for empty formula
    if (
      formula.filter((token) => token !== "(" && token !== ")" && token !== " ")
        .length === 0
    ) {
      this._errorMessage = ErrorMessages.emptyFormula;
      return;
    }

    // Get cell values
    formula.forEach((token, i) => {
      if (this.isCellReference(token)) {
        const [value, error] = this.getCellValue(token);
        this._errorMessage = error;
        formulaElementArray[i] = String(value);
      }
    });

    // Check for invalid formula
    if (this._errorMessage !== "") return;

    // Convert infix to postfix
    for (const token of formulaElementArray) {
      if (this.isNumber(token)) {
        results.push(token);
      } else if (token === "(") {
        operators.push(token);
      } else if (token === ")") {
        while (operators.length && operators[operators.length - 1] !== "(") {
          results.push(operators.pop()!);
        }
        operators.pop();
      } else {
        while (
          operators.length &&
          pemdas[token] <= pemdas[operators[operators.length - 1]]
        ) {
          results.push(operators.pop()!);
        }
        operators.push(token);
      }
    }

    // Push remaining operators to output queue
    while (operators.length) {
      results.push(operators.pop()!);
    }
    if (results.length === 1 && this.isNumber(results[0])) {
      this._result = Number(results[0]);
      return;
    }

    // Evaluate postfix expression
    for (const token of results) {
      if (this.isNumber(token)) {
        operands.push(Number(token));
      } else {
        // Check for insufficient operands
        if (operands.length < 2) {
          this._errorMessage = ErrorMessages.invalidFormula;
          break;
        }
        const nxt = operands.pop();
        const pre = operands.pop();
        if (nxt === undefined || pre === undefined) {
          this._errorMessage = ErrorMessages.invalidFormula;
          break;
        }
        // calculate the result
        switch (token) {
          case "+":
            operands.push(pre + nxt);
            break;
          case "-":
            operands.push(pre - nxt);
            break;
          case "*":
            operands.push(pre * nxt);
            break;
          case "/":
            if (nxt === 0) {
              this._errorMessage = ErrorMessages.divideByZero;
              this._result = Infinity;
              return;
            } else {
              operands.push(pre / nxt);
            }
            break;
        }
      }
    }

    // the first number in the operands array is the result
    this._result = operands[0];
  }

  public get error(): string {
    return this._errorMessage;
  }

  public get result(): number {
    return this._result;
  }

  /**
   *
   * @param token
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   *
   * @param token
   * @returns true if the token is a cell reference
   *
   */
  isCellReference(token: TokenType): boolean {
    return Cell.isValidCellLabel(token);
  }

  /**
   *
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   *
   */
  getCellValue(token: TokenType): [number, string] {
    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }

    let value = cell.getValue();
    return [value, ""];
  }
}

export default FormulaEvaluator;
