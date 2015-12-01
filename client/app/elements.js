riot.tag2('todo-list', '<div> <todo each="{todo, i in todos}" todo="{todo}"></todo> <button onclick="{addItem}">Add Todo</button> </div>', '', '', function(opts) {
      this.addItem = () => {
         var item = {
            key: new Date().toISOString(),
            text: 'New Todo!',
	    isComplete: false
         };
         this.itemStore.set(item.key, item);
      };

      this.sync = this.opts.sync;
      this.itemStore = {};
      this.todos = [];
      this.sync.onUpdated((updated) => {
         console.log('updated in element!', updated );
         this.itemStore = updated.todos;
         this.todos = Utils.toArray(this.itemStore);
         this.update();
      });
}, '{ }');



riot.tag2('todo', '{todo.text} <input id="checkbox" type="checkbox" __checked="{todo.isComplete}" onchange="{updateStatus}"> <button style="float: right" onclick="{removeItem}">X</button>', 'todo { display: block; background-color: #00FFFF; clear: both; } todo.completed { background-color: #DDDDDD; }', 'class="{completed: todo.isComplete}"', function(opts) {
		this.todo = opts.todo;
		this.updateStatus = () => {
			console.log(this.checkbox);
			this.todo.set('isComplete', this.checkbox.checked);
		};
		this.removeItem = () => {
			this.todo.parent.remove(this.todo.key);
		};
}, '{ }');
