Lithium UI
==========

A thin framework for building UI for web apps. Templating syntax inspired by KnockoutJS.

LUI has two parts:

1. Core (the minumum required to write your own components)
2. Components (a set of UI components inspired from [materializecss](materializecss.com))

### Quick overview

Out-of-the-box LUI gives:
- Classes and classical inheritance methods.
- Ability to write component view with HTML and data binding (using KnockoutJS inspired template engine and observables).
- Ability to write your own UI components and also inherit any component.
- Ability to use custom elements for any component in view markup.
- AMD support
- [CSS3 flexbox helper classes](https://github.com/Munawwar/flex-helper) for faster, simpler layouting.

### Why use Lithium UI?

- Team members may have different coding styles and JavaScript's flexibility has it's costs when a standard style isn't agreed upon. LUI sets a style/pattern for UI programming that you and team members would use.

- Higher performance (especially on mobile) and lesser bloat compared to most libraries (including KnockoutJS or most DOM diff-patch libraries) without sacrificing maintainability or convinience of writing components.

- One-way binding puts *you* in control of your application. Easier to debug.

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
              }
            });
        }
    });
});
```
Use the component in another template now:
```html
<app-form></app-form>
```

Tutorial
------
1. [Hello world](https://github.com/Munawwar/lithium-ui/wiki/Tutorial-1-Hello-World)
2. [Writing components](https://github.com/Munawwar/lithium-ui/wiki/Tutorial-2-Write-a-Component)
3. [Data-Binding](https://github.com/Munawwar/lithium-ui/wiki/Tutorial-3-Data-Binding)
