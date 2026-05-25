# Competitive Programming Problem Design Flow & AWS S3 Setup Guide
This document details the architecture, workflow, and cloud storage layout designed for the **Competitive Programming (CP) Problem Studio** in **AMS-Access-Web**. It draws inspiration from the industry-standard **Codeforces Polygon** paradigm, utilizing the robust C++ **`testlib.h`** library to ensure perfectly deterministic testcase generation and validation.

---

## 1. The Codeforces Polygon Paradigm
In high-stakes coding assessments, simply copying and pasting static input/output files is insecure and error-prone. A single typo in an expected answer can break the evaluation, and manual tests are easily leaked or guessed.

The **Polygon philosophy** models a coding challenge as an integrated ecosystem comprised of:
1. **General Info & Limits**: Time and memory bounds, plus stream configurations.
2. **Statement**: Markdown description with inline LaTeX math formulas.
3. **Validator**: A C++ program (`validator.cpp`) using `testlib.h` that parses testcases and confirms they strictly adhere to bounds (e.g., $1 \le N \le 10^5$, no trailing spaces, graphs are connected).
4. **Checker**: A C++ program (`checker.cpp`) using `testlib.h` that compares the participant's output against the jury's correct answer, outputting a detailed matching verdict (Accept, Wrong Answer, Presentation Error).
5. **Generators**: C++ programs using `testlib.h` that generate random or extreme testcases in a fully deterministic way using command-line seeds.
6. **Solutions**: A matrix of correct and incorrect codes (C++, Python, Java) with expected verdicts (e.g. `OK`, `WA`, `TLE`). The verification suite runs all solutions on all tests to confirm that the validator works, the checker compiles, and wrong/slow codes fail exactly as expected.

---

## 2. Step-by-Step CP Problem Creation Options
When creating a Competitive Programming question inside **AMS-Access-Web**, the administrator goes through the following tabs:

### A. General Info & Limits
- **Title & Points**: Basic metadata.
- **Time Limit (ms)**: The threshold (e.g., $1000\text{ ms} - 5000\text{ ms}$) above which a candidate solution receives a Time Limit Exceeded (`TLE`) verdict.
- **Memory Limit (MB)**: The RAM cap (e.g., $64\text{ MB} - 512\text{ MB}$) beyond which solutions receive a Memory Limit Exceeded (`MLE`) verdict.
- **Input/Output Styles**:
  - **Standard I/O** (Standard input/output stream, default).
  - **File I/O**: Specifying file names (e.g., `input.txt` and `output.txt`) that the sandbox must read from/write to.

### B. Statement Editor (LaTeX + Markdown)
Competitive programming requires precise mathematical formatting. The editor provides:
- **Markdown Textareas** split into: *Description*, *Input Format*, *Output Format*, and *Notes*.
- **LaTeX Math Support**: Mathematical equations enclosed in `$x$` for inline rendering or `$$x$$` for blocks.
- **Sample Tests Grid**: Automatically displays the marked sample test cases side-by-side in standard input/output containers.

### C. Input Validator (`validator.cpp`)
Instead of verifying tests by eye, a validator is written in C++ using `testlib.h`.
```cpp
#include "testlib.h"
int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    int n = inf.readInt(1, 100000, "n");
    inf.readEoln();
    for (int i = 0; i < n; i++) {
        inf.readInt(-1000000000, 1000000000, "A_i");
        if (i < n - 1) inf.readSpace();
    }
    inf.readEoln();
    inf.readEof();
    return 0;
}
```
If a generator generates a number out of range (e.g., $N = 100001$), the validator fails immediately, stopping bad testcases from reaching candidates.

### D. Output Checker (`checker.cpp`)
For problems with multiple correct answers (e.g. "print *any* path of length $K$"), simple string matching fails. A checker program resolves this.
1. **Standard Checkers**: Pre-compiled standard testlib checkers:
   - `ncmp`: Single or sequence of integers.
   - `wcmp`: Sequence of strings/tokens (ignores whitespace layout differences).
   - `rcmp6` / `rcmp9`: Compares floating numbers up to $10^{-6}$ or $10^{-9}$ precision.
   - `yesno`: Case-insensitive `YES`/`NO` comparator.
2. **Custom Checker**: Written in C++ when answers are complex or non-unique:
   ```cpp
   #include "testlib.h"
   int main(int argc, char* argv[]) {
       registerTestlibCmd(argc, argv);
       long long jury = ans.readLong();
       long long user = ouf.readLong();
       if (jury != user) quitf(_wa, "Expected %lld, found %lld", jury, user);
       quitf(_ok, "Answer matches");
   }
   ```

### E. Generator Scripts & Testcase Manager
Rather than uploading massive $20\text{ MB}$ files, administrators write simple generator programs and execute command line macros.
- **Generator Code**: A C++ file utilizing `testlib.h`'s deterministic random generator:
  ```cpp
  #include "testlib.h"
  #include <iostream>
  int main(int argc, char* argv[]) {
      registerGen(argc, argv, 1);
      int n = opt<int>(1); // Read N from argv[1]
      int max_val = opt<int>(2);
      cout << n << endl;
      for (int i = 0; i < n; i++) {
          cout << rnd.next(-max_val, max_val) << (i == n - 1 ? "" : " ");
      }
      cout << endl;
  }
  ```
- **Script Commands Console**: An input field where the administrator writes execution commands:
  ```bash
  gen_random 10 100 > $
  gen_random 1000 1000000 > $
  gen_extreme_all_negative 50000 > $
  ```
  The compiler automatically runs these sequentially, passing outputs through the validator and the correct model solution to generate expected outputs, and automatically uploads the compiled assets to S3.

---

## 3. AWS S3 Asset Setup Guide
For a brand new AWS account, here is the complete step-by-step setup to host the competitive programming assets securely.

### Step 1: Create a Private S3 Bucket
1. Open the [AWS Console](https://console.aws.aws.com) and navigate to **S3**.
2. Click **Create bucket**.
3. **Bucket Name**: Choose a unique name (e.g. `ams-assessment-testlib-assets`).
4. **AWS Region**: Select your closest region (e.g. `ap-south-1` Mumbai or `us-east-1` N. Virginia).
5. **Object Ownership**: Leave **ACLs disabled (recommended)**.
6. **Block Public Access settings**: Ensure **Block *all* public access** is **checked** (extremely important: we do not want raw testcases publicly readable).
7. Click **Create bucket**.

### Step 2: Bucket Folder Hierarchy
When the Next.js app syncs a problem, it maintains a strict namespace structure inside S3 to isolate contents:
```text
ams-assessment-testlib-assets/
└── contests/
    └── {contest_id}/
        └── problems/
            └── {problem_id}/
                ├── statement/
                │   ├── description.md
                │   └── images/
                │       └── graph_fig1.png
                ├── validator/
                │   ├── validator.cpp
                │   └── validator.bin (compiled executable for Linux executor)
                ├── checker/
                │   ├── checker.cpp
                │   └── checker.bin
                ├── solutions/
                │   ├── solution_main.cpp
                │   └── solution_slow_tle.py
                └── tests/
                    ├── 01.in (Sample Test 1 Input)
                    ├── 01.out (Sample Test 1 Expected Output)
                    ├── 02.in
                    ├── 02.out
                    └── ...
```

### Step 3: Configure CORS (Cross-Origin Resource Sharing)
Since the Next.js admin frontend will upload files (such as images, custom checker code, or manual testcases) directly to S3 via pre-signed URLs, the S3 bucket must permit CORS options.
1. Open your S3 bucket, go to the **Permissions** tab.
2. Scroll to the bottom to **Cross-origin resource sharing (CORS)** and click **Edit**.
3. Paste the following JSON:
   ```json
   [
       {
           "AllowedHeaders": [
               "*"
           ],
           "AllowedMethods": [
               "PUT",
               "POST",
               "GET",
               "HEAD"
           ],
           "AllowedOrigins": [
               "http://localhost:3000"
           ],
           "ExposeHeaders": [
               "ETag",
               "x-amz-server-side-encryption",
               "x-amz-request-id",
               "x-amz-id-2"
           ],
           "MaxAgeSeconds": 3000
       }
   ]
   ```
4. Click **Save changes**.

### Step 4: Create a Highly Restricted IAM Policy
We must adhere to the principle of least privilege. We create an IAM user for the Supabase backend/Next.js routes that can *only* read/write inside this S3 bucket.
1. Go to the **IAM Console**.
2. Click **Policies** on the left menu, then **Create policy**.
3. Switch to the **JSON** tab and paste the following policy (replace `ams-assessment-testlib-assets` with your bucket name):
   ```json
   {
       "Version": "2012-10-17",
       "Statement": [
           {
               "Sid": "ListBucketStructure",
               "Effect": "Allow",
               "Action": [
                   "s3:ListBucket",
                   "s3:GetBucketLocation"
               ],
               "Resource": "arn:aws:s3:::ams-assessment-testlib-assets"
           },
           {
               "Sid": "ReadWriteObjectsInBucket",
               "Effect": "Allow",
               "Action": [
                   "s3:PutObject",
                   "s3:GetObject",
                   "s3:DeleteObject",
                   "s3:PutObjectAcl"
               ],
               "Resource": "arn:aws:s3:::ams-assessment-testlib-assets/*"
           }
       ]
   }
   ```
4. Click **Next**, then **Review**.
5. Name it `AMSAccessS3TestlibPolicy` and click **Create policy**.

### Step 5: Create IAM User & Access Keys
1. In the **IAM Console**, click **Users** on the left menu, then **Add users**.
2. **User name**: `ams-backend-s3-user`.
3. Check **Attach policies directly**, search for `AMSAccessS3TestlibPolicy`, and select it.
4. Click **Next**, then **Create user**.
5. Click on the newly created user `ams-backend-s3-user`.
6. Go to the **Security credentials** tab, scroll down to **Access keys**, and click **Create access key**.
7. Choose **Application running outside AWS** and click **Next**.
8. Click **Create access key**.
9. Copy your **Access Key ID** and **Secret Access Key** and save them securely in your `.env.local` file:
   ```env
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   AWS_REGION=ap-south-1
   AWS_S3_BUCKET=ams-assessment-testlib-assets
   ```

---

## 4. Backend Synchronization Flow (Presigned URLs)
To prevent AWS credentials from ever leaking to candidate browsers, the application uses **S3 Presigned URLs**. When an administrator uploads a testcase or validator code, the flow works as follows:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin Browser
    participant API as Next.js API Handler
    participant S3 as AWS S3 Bucket
    participant DB as Supabase DB

    Admin->>API: GET /api/org/s3/presign-upload?key=contests/C1/problems/P1/validator/validator.cpp
    Note over API: Verifies admin's Supabase session role
    API->>API: Create AWS S3Client with backend env credentials
    API->>API: Generate Presigned PutObject URL (valid for 5 mins)
    API-->>Admin: Return { uploadUrl, downloadUrl }
    
    Admin->>S3: PUT /contests/C1/problems/P1/validator/validator.cpp (Headers, raw file body)
    S3-->>Admin: 200 OK (Uploaded securely directly to S3)
    
    Admin->>API: PATCH /api/org/contests/C1/questions/P1
    Note over API: Updates record in Supabase with S3 URLs
    API->>DB: UPDATE contest_questions SET s3_validator_path = ...
    DB-->>API: Row updated
    API-->>Admin: Success
```

### AWS SDK v3 Code Snippet (Next.js Endpoint)
To generate the presigned upload URL securely on the backend, implement this handler under `src/app/api/org/s3/presign-upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user role using Supabase Server Client
    // (Only permit org owners/admins to generate upload keys)
    
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      ContentType: "text/plain", // Adjust as necessary
    });

    // URL is valid for 300 seconds (5 minutes)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const downloadUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return NextResponse.json({ uploadUrl, downloadUrl });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
  }
}
```

This ensures a fully integrated, highly secure, and extremely scalable Competitive Programming infrastructure inside **AMS-Access**.

---

## 5. Local File Uploading Workflow
To ease problem creation and testing before full cloud integration, administrators can upload C++ source files (e.g. `validator.cpp` or custom checkers `checker.cpp`) directly from their local system.
- **Client-Side FileReader API**: The React studio implements high-performance `<input type="file">` loaders powered by the native browser `FileReader` API.
- **Instant Synchronization**: Uploaded file data is parsed entirely in the client session, populating the editor instantly without requiring preliminary network requests or server storage overhead.
- **Ready for Offline Drafting**: Administrators can design and audit testlib C++ validators/checkers locally in their favorite editor, then upload them directly into the CP Problem Studio for compilation verification.
