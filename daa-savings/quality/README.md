# DAA Savings Summary source-quality gate

**Status: staging only, NOT an approved master.**

The previous renderer at `daa-savings/production/batch-2026-09-18/render_batch.py` resizes and crops an existing proof bitmap. Do not use screenshot-derived crops as a production source for any new Savings Summary.

The SVG source-quality check refuses a nominal high-resolution export when embedded images (signature, creditor logos, BBB graphics, headshot, etc.) must be enlarged beyond the chosen threshold. Example:

```bash
python daa-savings/quality/check_svg_assets.py candidate.svg --export-width 4344
```

**Required before release**
1. Obtain the single approved layout source and native/original brand and signature assets. An old flattened PNG is a visual reference, not a source of new image detail.
2. Build one editable 4:3 master at the approved geometry. All copy, labels, figures and footer details must be editable elements, not screenshots.
3. Fix cramped or clipped fields; compare the entire master against the approved reference and confirm brand/creditor assets are authentic.
4. Run the SVG raster gate against the intended export size and fail release on low-resolution graphics.
5. Export a fresh lossless PNG for each client from the *same master*, never from a previous rendered PNG. Validate figures and client details separately.
6. Test the actual delivered Gmail message (including its narrow-screen display) and obtain approval.
7. Freeze the approved private source and output hashes. Never place client names, financial details, or private image files in a public GitHub repository.

Do not promote a reconstructed proof as approved merely because it is called "hi-res", "locked", or "master". Keep FRONTLINE campaign templates untouched.
