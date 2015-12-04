riot.tag2('app', '<div if="{!db}"> <h1>Loading...</div> </div> <div if="{db}"> <div if="{loc.main==\'\'}"> <h1>Home</h1> <a href="#todos">Todos</a> </div> <div if="{loc.main==\'todos\'}"> <todos todos="{db.todos}"></todos> </div> </div>', '', '', function(opts) {
        this.db = null;
        var sync = new SyncNodeSocket.SyncNodeSocket('data', {});

        sync.onUpdated((updated) => {
            this.db = updated;
            this.update();
        });

        this.loc = {
            main: ''
        }

        riot.route((main, id, action) => {
            console.log('routing...', main, id, action);
            this.loc.main = main;
            this.update();
        });
        riot.route.start();
        riot.route('');
}, '{ }');

riot.tag2('todos', '<div> <h1>Todos</h1> <form onsubmit="{add}" action=""> <input name="newGroup"> <input type="submit" value="Add"> </form> <todo-group each="{group, i in todos}" group="{group}"></todo-group> </div>', '', '', function(opts) {
        this.on('update', () => {
            console.log('here1');
            this.itemStore = this.opts.todos;
            console.log('here2');
            this.todos = Utils.toArray(this.itemStore);
            console.log('todos', this.todos);
        });
        this.add = () => {
            console.log('newGroup', this.root, this.newGroup);

            var item = {
                key: new Date().toISOString(),
                text: this.newGroup.value,
                items: {}
            };
            this.itemStore.set(item.key, item);
            this.newItem.value = '';
            return false;
        };
}, '{ }');

riot.tag2('todo-group', '<div> <button style="float: right" onclick="{remove}">X</button> <h3>{opts.group.text}</h3> <form onsubmit="{addItem}"> <input name="newItem"> <input type="submit" value="Add Item"> </form> <todo each="{todo, i in todos}" todo="{todo}"></todo> </div>', '', '', function(opts) {
        this.addItem = () => {
            var item = {
                key: new Date().toISOString(),
                text: this.newItem.value,
                isComplete: false
            };
            this.itemStore.set(item.key, item);
            this.newItem.value = '';
        };
        this.remove = () => {
            if (confirm('Delete?')) {
                this.opts.group.parent.remove(this.opts.group.key);
            }
        }

        this.itemStore = this.opts.group.items;
        console.log('updated in element!', this.opts);
        this.todos = Utils.toArray(this.itemStore);
}, '{ }');



riot.tag2('todo', '<input id="checkbox" type="checkbox" __checked="{todo.isComplete}" onchange="{updateStatus}">{todo.text} <button style="float: right" onclick="{removeItem}">X</button>', 'todo { display: block; background-color: #00FFFF; clear: both; } todo.completed { background-color: #DDDDDD; }', 'class="{completed: todo.isComplete}"', function(opts) {
        this.todo = opts.todo;
        this.updateStatus = () => {
            console.log(this.checkbox);
            this.todo.set('isComplete', this.checkbox.checked);
        };
        this.removeItem = () => {
            this.todo.parent.remove(this.todo.key);
        };
}, '{ }');