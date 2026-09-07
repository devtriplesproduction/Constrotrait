const fs = require('fs');
const PNG = require('pngjs').PNG;

fs.createReadStream('public/Constrotriat Logo PNG 1.png')
  .pipe(new PNG())
  .on('parsed', function() {
    const colors = {};
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let idx = (this.width * y + x) << 2;
        let r = this.data[idx];
        let g = this.data[idx + 1];
        let b = this.data[idx + 2];
        let a = this.data[idx + 3];
        if (a > 0) {
          let rgb = `${r},${g},${b}`;
          colors[rgb] = (colors[rgb] || 0) + 1;
        }
      }
    }
    const sorted = Object.entries(colors).sort((a, b) => b[1] - a[1]);
    console.log(sorted.slice(0, 10));
  });
