lithium-ui
==========

A UI framework inspired by Ext's component architecture and Knockout's template syntax.

### Teaser
Template
```html
<div style="positon:absolute; width:500px;">
    <div class="hbox">
      <input type="text" class="flex namefield form-control"
        placeholder="Your name" data-bind="value: name" />
      <lui-button ref="submitBtn">Submit</lui-button>
    </div>
</div>
```
Component
```javascript
/**
 * A Form window
 */
define(['lui/core/Box', 'tpl!./myform.ko'], function (Lui) {
    return Lui.extend('app.form', Lui.Box, {
        name: Lui.Observable(''), //An observable..like KnockoutJS
        
        constructor: function (config) {
            this.super(arguments);
          
            this.on({
              "submitBtn": { //listen to events on root element of component
                  click: function () {
                      //Update observable
                      this.name($('.namefield', this.el)[0].value);
                      console.log('Data submitted: ' + this.name());
                      this.submitBtn.disable();
                  }
              },
              scope: this
              //Alternatively, use event delegation and add click event to root element of this component.
              //click: function () {...}
            });
        }
    });
});
```
Use the component in another template.
```html
<app-form></app-form>
```

Tutorial
------
1. [Hello world](wiki/Tutorial-1-Hello-World)
2. [Writing components](wiki/Tutorial-2-Write-a-Component)
3. [Data-Binding](wiki/Tutorial-3-Data-Binding)
