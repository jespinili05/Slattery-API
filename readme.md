### 🛠 **Objective**

Create a new JavaScript module: `generateProposals.js`. This script will programmatically generate customized proposal PDFs based on structured input from `data.json` and modular PDF templates in the `Templates/` directory.

---

### 📂 **Context & Reference Files**

You already have the following supporting modules:

* `mergePDFs.js` — Handles merging multiple PDFs into one.
* `tableOfContent.js` — Dynamically generates a Table of Contents.
* `fillDynamicTemplate.js` — Fills PDF templates with dynamic field data.

Use these modules as references.

---

### 📄 **Data Source**

* **Input:** `data.json`
  This contains:

  * General company/project details
  * List of templates to include
  * Dynamic values (e.g. for placeholders or form fields)
  * Optional sections like staff profiles with corresponding data

---

### 📁 **Template Directory**

* Location: `Templates/`
* PDF files:

  * `Company.pdf` — Used for the **front page**
  * Others listed in `data.json.templates[]`

---

### 🧠 **Functionality: `generateProposals()`**

Your main function should:

#### 1. **Generate Front Page**

* Use `Company.pdf` from the Templates folder.
* Fill it dynamically using logic from `fillDynamicTemplate.js`.

#### 2. **Generate Table of Contents**

* Based on the `templates` array from `data.json`.
* Programmatically build the ToC using logic from `tableOfContent.js`.

#### 3. **Compile Proposal PDF**

Iterate over `templates[]` in `data.json`:

* For each template:

  * **If** type is `"dynamic"`, insert values using logic from `fillDynamicTemplate.js`.
  * **If** template name is `"Staff Profiles"` and `staff` data is present:

    * Include each staff member’s details appropriately.
* Append each processed template in order.

#### 4. **Final Merge**

Use `mergePDFs.js` to combine:

1. Front Page
2. Table of Contents
3. All processed templates

Output a single, ordered PDF file: `GeneratedProposal.pdf`.

---

### 🧩 Optional Enhancements (if applicable)

* Auto-generate filenames using metadata (e.g. project name, date)
* Add page numbers after merging

---

### ✅ Deliverable

A complete `generateProposals.js` module that can be imported or run to generate a full proposal document based on `data.json`.
