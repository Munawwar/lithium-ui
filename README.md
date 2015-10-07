lithium-ui
==========

A thin framework for building UI. Templating syntax inspired by KnockoutJS.

### Why use Lithium UI?

Higher performance and lesser bloat compared to most libraries including KnockoutJS or ReactJS (especially on mobile) without sacrificing convinience of writing code or maintainability.

#### How is lithium UI doing this?
- Knowing exactly which data should affect which part of the DOM gives the high performance. This is achieved through KO-like templating engine and KO-like observables (React's performance [doesn't seem that impressive on mobile](https://aerotwist.com/blog/react-plus-performance-equals-what/) BTW).
- One-way binding gives high performance comparable to KO (Remember [Angular 1](https://www.quora.com/Why-is-the-two-way-data-binding-being-dropped-in-Angular-2)?)
- One-way binding puts you in control of your application. (You don't need to place breakpoints in the library code to figure out what-is-updating-what. It is easier to debug your own code than mine, of course).

### Teaser
Template
```html
<div style="positon:absolute; width:500px;">
    <div class="hbox">
      <input type="text" class="flex namefield form-control"
        placeholder="Your name" data-bind="value: name" />
      <li-button ref="submitBtn">Submit</li-button>
    </div>
</div>
```
Component
```javascript
/**
 * A Form window
 */
define(['lui/core/Box', 'tpl!./myform.ko'], function (Li) {
    return Li.extend('app.form', Li.Box, {
        name: Li.Observable(''), //An observable..like KnockoutJS
        
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
              //Alternatively, use event delegation and add
              //the click handler to root element of this component.
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
1. [Hello world](https://github.com/Munawwar/lithium-ui/wiki/Tutorial-1-Hello-World)
2. [Writing components](https://github.com/Munawwar/lithium-ui/wiki/Tutorial-2-Write-a-Component)
3. [Data-Binding](https://github.com/Munawwar/lithium-ui/wiki/Tutorial-3-Data-Binding)
