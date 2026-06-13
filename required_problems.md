# Requirements for Creating Problems in AMS Access

Based on the structure of the contest and question systems in the AMS Access platform, here is a comprehensive breakdown of everything you need to prepare beforehand to create a problem seamlessly.

## 1. Standard Code / CP Questions
For standard competitive programming or algorithmic questions, you should prepare the following assets:

### A. Metadata & Statement
- **Title:** The name of the problem.
- **Points:** The total score for the problem.
- **Limits:** 
  - Time Limit (in milliseconds, minimum 100ms, e.g., 2000).
  - Memory Limit (in Megabytes, minimum 16MB, e.g., 256).
- **Problem Statement (Markdown / `.md` or `.tex` equivalents):**
  - Use standard Markdown with MathJax/LaTeX support for math (e.g., `$x^2$` for inline, `$$x^2$$` for block).
  - The system parses the statement into specific sections. It's best to structure your document with these exact headers:
    - `### Input Format`
    - `### Output Format`
    - `### Sample Input`
    - `### Sample Output`
    - `### Note`

### B. Interactive Visualizations (Optional but Recommended)
The platform supports embedding interactive widgets directly into the problem statement (e.g., Array Simulators).
- **HTML/CSS/JS Snippets:** If you intend to use interactive components, you can embed them inside `<code>...</code>` blocks within your Markdown description. 
- You can also provide **Starter HTML, CSS, and JS** for interactive specific question types.
- **Assets:** Any images needed should be hosted and referenced via Markdown `![alt](url)`.

### C. Judge & Verification Configuration (C++ with `testlib.h`)
To automate the judging pipeline, you need:
- **Validator Code (`validator.cpp`):** A C++ program using `testlib.h` to strictly validate the format and constraints of all input files.
- **Checker Code (`checker.cpp`):** Required if your problem has multiple valid outputs or requires floating-point comparisons. Written in C++ using `testlib.h`. (If output is exact, the platform provides a default "Token" checker).
- **Generators (`generator.cpp`):** C++ programs using `testlib.h` to generate random/edge-case inputs.
- **Generator Scripts:** A configuration script defining how generators are called to build test cases (e.g., `gen_random 100 50 -1000 1000 > $`).
- **Test Cases:** Prepare manual test cases as Input/Output text files. You can also package these into a single `.zip` file for bulk uploading.

---

## 2. Connected Problems (Follow-Up Questions)
"Follow-up" or "Connected" problems are a separate question type designed for multi-part, short-answer questions. They do not use the CP judging pipeline (no C++ checkers/validators needed).

For these, you need to prepare:
- **Main Title:** The overarching title for the connected problem set.
- **Parts (Sub-problems):** For *each* connected part, prepare:
  1. **Statement (Markdown + MathJax):** The specific question or prompt for this part.
  2. **Expected Answer:** The exact string or value the system will match against (e.g., `-2 or -3`, `42`).
  3. **Points:** The individual point value for this specific part. (The total problem score is automatically calculated as the sum of all parts).

---

## 3. Markov Chain Problems (Specialized)
If you are designing a Markov Chain problem:
- **Problem Statement:** Markdown describing the Markov system the student must model.
- **Answer Key (JSON):** You will need to build the correct Markov chain using the visual editor on the platform, which generates a JSON structure containing `states` and `transitions`. You can also prepare this JSON structure manually.

### Summary Checklist for a Single CP Question Directory:
```text
/my_problem
  ├── statement.md        (Contains problem description, input/output formats)
  ├── validator.cpp       (testlib.h based input validator)
  ├── checker.cpp         (testlib.h based custom checker, if needed)
  ├── generator.cpp       (testlib.h based test generator)
  ├── gen_script.txt      (Generator pipeline execution commands)
  └── /tests
      ├── input_01.txt    (Manual inputs)
      └── output_01.txt   (Manual outputs)
```
