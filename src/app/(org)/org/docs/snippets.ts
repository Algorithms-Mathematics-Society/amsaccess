/**
 * Every snippet in the problemsetting guide.
 *
 * Kept out of the page component so they can be checked against the real
 * thing: each one is copied from a working problem in the `ams-ascent`
 * contest or from `cxxprobe --help`, not written from memory. A guide that
 * documents a flag the CLI does not have costs a setter an evening.
 */

export const LAYOUT = `my-contest/
├── contest.yaml                 # created by: cxxprobe new contest
└── a-beet-cast/                 # one directory per problem — the slug
    ├── problem.yaml             # the only required file
    ├── statement/
    │   └── problem.md           # markdown, shown to candidates
    ├── tests/
    │   ├── 1.in   1.ans         # I/O cases, paired by name
    │   └── 2.in   2.ans
    ├── solutions/
    │   └── main.cpp             # your reference solution
    └── checker/                 # optional
        └── behavior_gtest.cpp   # behaviour tests, if any`;

export const PROBLEM_YAML = `version: 2
name: 'A: beet_cast'

statement:
  dir: statement
  entry: problem.md

tests:
  dir: tests
  manifest: null        # null = every file pair in tests/

solutions:
  dir: solutions
  entries: []           # empty = every .cpp in solutions/

limits:
  memory_mb: null       # null = platform default (256 MB)
  cpu: null             #        5 s CPU
  wall: null            #        10 s wall
  pids: null

compiler:
  cxx: null             # null = the judge's g++ with -O2 -std=c++23
  std: null
  flags: null
  extra_sources: []`;

export const SYMBOLIC = `symbolic:
  must_include:
    - std::bit_cast

  must_not_include:
    - pattern: '\\\\bmemcpy\\\\s*\\\\('
      regex: true
      message: Use std::bit_cast for type punning instead of memcpy.

    - pattern: reinterpret_cast
      regex: false
      message: >
        reinterpret_cast-based type punning through a pointer cast is
        undefined behavior — use std::bit_cast instead.`;

export const BEHAVIOUR = `checker:
  dir: checker
  behavior:
    entry: behavior_gtest.cpp
    extra_flags: []`;

export const GTEST = `// checker/behavior_gtest.cpp
//
// Compiled *together with* the candidate's submission, so it can call their
// types directly. There is no stdin/stdout here — assert on the API.
#include <gtest/gtest.h>

TEST(Vector, GrowsWithoutLosingElements) {
    MyVector<int> v;
    for (int i = 0; i < 1000; ++i) v.push_back(i);
    ASSERT_EQ(v.size(), 1000u);
    EXPECT_EQ(v[0], 0);
    EXPECT_EQ(v[999], 999);
}

TEST(Vector, CopyIsDeep) {
    MyVector<int> a;
    a.push_back(1);
    MyVector<int> b = a;   // a shallow copy double-frees and shows up as RE
    b.push_back(2);
    EXPECT_EQ(a.size(), 1u);
    EXPECT_EQ(b.size(), 2u);
}`;

export const STATEMENT = `# A: beet cast

## Statement

Beetroots are fun, and so are their prices. Read \`n\` prices as
\`float\` and print the exact bit pattern of each as an unsigned
32-bit integer.

## Input

The first line contains \`n\`. Each of the next \`n\` lines holds
one float.

## Output

\`n\` lines, each the bit pattern of the corresponding float.

## Constraints

- \`1 <= n <= 1000\``;

export const WORKFLOW = `# 1. once per contest
cxxprobe new contest my-contest
cd my-contest

# 2. scaffold a problem — creates the whole layout
cxxprobe package init a-beet-cast

# 3. write statement/, tests/, solutions/, checker/ …

# 4. does the reference solution actually pass?
cxxprobe test problem a-beet-cast

# 5. is the package well-formed?
cxxprobe package validate a-beet-cast

# 6. what will candidates see?
cxxprobe package inspect a-beet-cast

# 7. one problem per pack — see the note below
cxxprobe package pack --problems a-beet-cast -o a-beet-cast.cxxpkg`;
