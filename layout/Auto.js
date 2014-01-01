INCLUDE('layout.js');
/*This class possibly is obsoleted by flex.css*/

Lui.layout.Auto = Li.extend(Object, {
    renderItems: function () {
        this.items.forEach(function(item, i) {
            item.parent = this;
            if (item instanceof Lui.Component) {
                item.render(this.rootEl, i);
            } else {
                this.items[i] = Lui.create(this.rootEl, [item]);
            }
        }, this);
    }
});
