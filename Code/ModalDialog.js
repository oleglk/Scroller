// ModalDialog.js - from: https://css-tricks.com/replace-javascript-dialogs-html-dialog-element/
//

//(does not work) export default class Dialog {}
class Dialog {
  constructor(settings = {}) {
    this.settings = Object.assign(
      {
        /* DEFAULT SETTINGS - see description below */
        eventsToBlockWhileOpen: [],
      },
      settings
    )
    this.init()
  }

  init() {
    // Testing for <dialog> support
    this.dialogSupported = typeof HTMLDialogElement === 'function'
    this.dialog = document.createElement('dialog')
    this.dialog.dataset.component = this.dialogSupported ? 'dialog' : 'no-dialog'
    this.dialog.role = 'dialog'
    
    // HTML template
    this.dialog.innerHTML = `
  <form method="dialog" data-ref="form">
    <fieldset data-ref="fieldset" role="document">
      <legend data-ref="message" id="${(Math.round(Date.now())).toString(36)}">
      </legend>
      <div data-ref="template"></div>
    </fieldset>
    <menu>
      <button data-ref="cancel" value="cancel"></button>
      <button data-ref="accept" value="default"></button>
    </menu>
    <audio data-ref="soundAccept"></audio>
    <audio data-ref="soundOpen"></audio>
  </form>`

    document.body.appendChild(this.dialog)

    // ...

    this.elements = {}
    this.dialog.querySelectorAll('[data-ref]').forEach(el => this.elements[el.dataset.ref] = el)

    // For screen readers, we need an aria-labelledby attribute pointing to the ID of the tag that describes the dialog
    this.dialog.setAttribute('aria-labelledby', this.elements.message.id)

    this.focusOwnerBeforeDialog = ''  // to know where to return focus at close
    //this.settings.eventsToBlockWhileOpen = [];

    // HTML dialog element has a built-in cancel() method
    this.elements.cancel.addEventListener('click', () => { 
      this.dialog.dispatchEvent(new Event('cancel')) 
    })

    // add keydown event listener handling all our keyboard navigation logic:
    this.dialog.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        if (!this.dialogSupported) e.preventDefault()
        this.elements.accept.dispatchEvent(new Event('click'))
      }
      if (e.key === 'Escape') this.dialog.dispatchEvent(new Event('cancel'))
      if (e.key === 'Tab') {
        e.preventDefault()
        const len =  this.focusable.length - 1;
        let index = this.focusable.indexOf(e.target);
        index = e.shiftKey ? index-1 : index+1;
        if (index < 0) index = len;
        if (index > len) index = 0;
        this.focusable[index].focus();
      }
    })
    
    /* call toggle() at the end of `init`: */
    this.toggle(false)
  }//END_OF__init()

  
  // to hide the HTML dialog element for browsers that do not support it
  toggle(open) {
    if (this.dialogSupported && open)  {
      console.log("-D- Open-dialog at:");  console.trace();  // OK_TMP
      this.dialog.showModal()
      this.dialog.hidden = false  // Oleg
    }
    if (!this.dialogSupported || (open == false)/*Oleg*/) {
      console.log("-D- Close-dialog at:");  console.trace();  // OK_TMP
      document.body.classList.toggle(this.settings.bodyClass, open)
      this.dialog.hidden = !open
      /* If a `target` exists, set focus on it when closing */
//debugger;  // OK_TMP
      // if (this.elements.target && !open) {
      //   this.elements.target.focus()
      // }
      if ((this.focusOwnerBeforeDialog !== undefined) &&
          (this.focusOwnerBeforeDialog != ''))  {
        this.focusOwnerBeforeDialog.focus()  // Oleg: restore focus to pre-dialog
        this.focusOwnerBeforeDialog = ''     // Oleg: forget it
      }
    }
  }

  
  /* to trap focus so that the user can tab between the buttons in the dialog
   *  without inadvertently exiting the dialog */
  getFocusable() {
//    return [...this.dialog.querySelectorAll('button,[href],select,textarea,input:not([type=&quot;hidden&quot;]),[tabindex]:not([tabindex=&quot;-1&quot;])')]

//    return [...this.dialog.querySelectorAll(`button,[href],select,textarea,input:not([type=";hidden";]),[tabindex]:not([tabindex=";-1";])`)]

//    return [...this.dialog.querySelectorAll( 'input, button, textarea' )]

    // from: https://zellwk.com/blog/keyboard-focusable-elements/
    return [...this.dialog.querySelectorAll( 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])' )]
}


  // show the dialog
  open(settings = {}) {
    const dialog = Object.assign({}, this.settings, settings)
    this.dialog.className = dialog.dialogClass || ''

    /* set innerText of the elements */
    this.elements.accept.innerText = dialog.accept
    this.elements.cancel.innerText = dialog.cancel
    this.elements.cancel.hidden = dialog.cancel === ''
    this.elements.message.innerText = dialog.message

    //~ /* If sounds exists, update `src` */
    //~ this.elements.soundAccept.src = dialog.soundAccept || ''
    //~ this.elements.soundOpen.src = dialog.soundOpen || ''
    /* Oleg: block sound-related stuff - it doesn't work */
    this.elements.soundAccept.src = ''
    this.elements.soundOpen.src = ''

    /* A target can be added (from the element invoking the dialog */
    this.elements.target = dialog.target || ''

    /* Oleg: if old focused element known, store it to return focus upon close */
    if (this.elements.target != '')  {
      this.focusOwnerBeforeDialog = this.elements.target.activeElement
    } else {
      this.focusOwnerBeforeDialog = ''
    }

    /* Optional HTML for custom dialogs */
    this.elements.template.innerHTML = dialog.template || ''

    /* Grab focusable elements */
    this.focusable = this.getFocusable()
    this.hasFormData = this.elements.fieldset.elements.length > 0
    if (dialog.soundOpen) {
      /* Oleg: block sound-related stuff - it doesn't work */
      // this.elements.soundOpen.play()
    }
    this.toggle(true)
    if (this.hasFormData) {
      /* If form elements exist, focus on that first */
      this.focusable[0].focus()
      this.focusable[0].select()
    }
    else {
      this.elements.accept.focus()
    }
  }


  // mimic the functionality that waits for a user’s input after execution
  waitForUser() {
    return new Promise(resolve => {
      this.dialog.addEventListener( 'cancel', () => { 
        this.toggle(false)
        window.removeEventListener('click', this._blockEventHandler)
        resolve(false)  /* simpler alternative to 'reject()' */
      }, { once: true } /*{once: true} == remove event listeners immediately*/ )
      this.elements.accept.addEventListener( 'click', () => {
        let value = this.hasFormData ? 
            this.collectFormData(new FormData(this.elements.form)) : true;
        /* Oleg: block sound-related stuff - it doesn't work */
        //if (this.elements.soundAccept.src) this.elements.soundAccept.play()
//debugger  // OK_TMP        
        this.toggle(false)
        this.settings.eventsToBlockWhileOpen.forEach( (evType) =>
          window.removeEventListener(evType, this._blockEventHandler) )
        resolve(value)
      }, { once: true } /*{once: true} == remove event listeners immediately*/ )
      // Oleg: block mouse clicks while dialog open
      this.settings.eventsToBlockWhileOpen.forEach( (evType) =>
        window.addEventListener(evType, this._blockEventHandler, {once: false}) )
    })
  }

  
  _blockEventHandler(event)  {  // Oleg: blocks mouse clicks while dialog open
    // TODO: do not block if target is in "focusable" list
    console.log("---IGNORED---")
    event.preventDefault();
    // Unfortunately event prevention blocks timed alert
    /* Keep the rest of the handlers from being executed
     *   (and it prevents the event from bubbling up the DOM tree) */
    event.stopImmediatePropagation();
  }

  
  collectFormData(formData) {
    const object = {};
    formData.forEach((value, key) => {
      if (!Reflect.has(object, key)) {
        object[key] = value
        return
      }
      /* 2-nd, etc, occurence of object[key] means object[key] treated as array:
       * at the 2nd occurence - convert from simple property to 1-element array*/
      if (!Array.isArray(object[key])) {
        object[key] = [object[key]]
      }
      object[key].push(value)  // add 2nd, 3rd, etc. occurences
    })
    return object
  }


  /* mimic native Javascript dialog.alert() */
  alert(message, config = { target: event.target }) {
    /* We set cancel and template to empty strings,
     * so that — even if we had set default values earlier —
     * these will not be hidden, and only message and accept are shown */
    const settings = Object.assign(
      {},
      config,
      { cancel: '', message, template: '' }
    )
    this.open(settings)
    return this.waitForUser()
  }


  /* mimic native Javascript dialog.confirm() */
  confirm(message, config = { target: event.target }) {
    // shows the message, cancel and accept items
    const settings = Object.assign({}, config, { message, template: '' })
    this.open(settings)
    return this.waitForUser()
  }


  /* mimic native Javascript dialog.prompt().
   * {target: event.target} - a reference to DOM element that calls the method */
  prompt(message, value, config = { target: event.target }) {
//debugger  // OK_TMP
    // add a template with an <input> that we’ll wrap in a <label>
    const template = `
  <label aria-label="${message}">
    <input name="prompt" value="${value}">
  </label>`
    const settings = Object.assign({}, config, { message, template })
    try  {
      this.open(settings)
    } catch (error) {
      console.error(error);
    }
    return this.waitForUser()
  }

}// END_OF__class_Dialog
