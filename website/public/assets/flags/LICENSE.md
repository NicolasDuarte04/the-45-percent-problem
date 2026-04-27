# Flag SVG attribution

The flag SVGs in this directory are vendored from
[lipis/flag-icons](https://github.com/lipis/flag-icons) (4x3 set), licensed
under the MIT License. They are renamed from ISO 3166-1 alpha-2 (and
`gb-eng` / `gb-sct`) to FIFA 3-letter codes used by this project.

To re-fetch from upstream, run from `website/`:

    npm run flags:fetch          # idempotent, skips files already present
    npm run flags:fetch -- --force   # overwrite existing

The FIFA → ISO mapping lives in `scripts/fetch-flags.mjs`.

---

MIT License

Copyright (c) 2013 Panayiotis Lipiridis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
