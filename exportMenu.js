var fs = require('fs');
var path = '../data/data.json';


get((data) => {
	var cats = data.menu.categories;
	var result = '';
	Object.keys(cats).forEach((key) => {
		if(!(cats[key].isDisabled) && cats[key].name) {
			var cat = cats[key];
			Object.keys(cat.items).forEach((key) => {
				var item = cat.items[key];
				if(item.name && !item.isDisabled && item.price >= 0) {
					var line = '';
					line += ',';
					line += item.name + ',';
					line += ',';
					line += cat.name + ',';
					line += ',';
					line += ',';
					line += Math.round(item.price * 100) / 100 + ',';
					line += ',';
					line += ',';
					line += ',';
					line += ',';
					line += 'N,';
					line += (item.isAlcohol ? 'N' : 'Y');
					console.log(line);
					result += line + '\n';
				};
			});
		}
	});

	fs.writeFileSync('exported.csv', result);
});


	function get(callback) {
		fs.readFile(path, 'utf8', (err, data) => {
			if (err) {
				if (err.code === 'ENOENT') {
					callback(null);
				}
				else {
					console.error('Failed to read ' + path + ': ' + err);
					callback(null);
				}
			}
			else {
				callback(JSON.parse(data));
			}
		});
	}

	function persist() {
		console.log(path);
		fs.mkdir(this.directory, null, (err) => {
			if (err) {
				// ignore the error if the folder already exists
				if (err.code != 'EEXIST') {
					console.error('Failed to create folder ' + this.directory + ': ' + err);
					return;
				}
			}
			var str = JSON.stringify(this.data);
			fs.writeFile(path + '.json', str, (err) => {
				if (err) {
					console.error('Failed to write ' + path + ': ' + err);
				}
			});
			if (this.numBackups > 0) {
				var backupPath = path + ((this.backupCount++ % this.numBackups) + 1).toString() + '.json';
				fs.writeFile(backupPath, str, (err) => {
					if (err) {
						console.error('Failed to write backup ' + backupPath + ': ' + err);
					}
				});
			}
		});
	}

