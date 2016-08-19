Lithium UI
==========

A thin framework for building UI for single page web apps. Templating syntax inspired by KnockoutJS.

LUI has two parts:

1. Core (the minumum required to write your own components)
2. Components (a set of UI components inspired from [materializecss](materializecss.com))

### What's in the package?

Out-of-the-box LUI gives:
- Modular components...
- ..including ability to write your own UI components and also inherit any component.
- HTML view with data binding (using KnockoutJS inspired templating engine and observables).
- All components can be used as custom elements in view markup by default.
- AMD and SystemJS support.
- [CSS3 flexbox helper classes](https://github.com/Munawwar/flex-helper) for faster, simpler layouting.
- node.js testability (with jsdom and [systemjs-emulator](https://github.com/Munawwar/lithium-ui/blob/master/test/setup.js)).
- Several [ready-to-use components](https://github.com/Munawwar/lithium-ui/tree/master/components). Using them is optional of course.

### Why use Lithium UI?

- Patterns: Team members may have different coding styles and JavaScript's flexibility has it's costs when a standard style isn't agreed upon. LUI sets a pattern for UI programming that you and team members would use.

- Performance & footprint: Higher performance (especially on mobile) and lesser bloat compared to most libraries (including KnockoutJS or most DOM diff-patch libraries) without sacrificing maintainability or convinience of writing components.

- One-way binding: Puts *you* in control of your application. Easier to debug.

### Teaser
Template (myform.ko)
```html
<div style="positon:absolute; width:500px;">
    <div class="hbox">
      <input type="text" class="flex namefield form-control"
        placeholder="Your name" data-bind="value: name" />
      <li-button ref="submitBtn">Submit</li-button>
    </div>
</div>
```
Component (App/Form.js)
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
              "submitBtn": { //listen to events on button
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
