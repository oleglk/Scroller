// ModalDialog.js - from: https://css-tricks.com/replace-javascript-dialogs-html-dialog-element/
//

export default class Dialog {
  constructor(settings = {}) {
    this.settings = Object.assign(
      {
        /* DEFAULT SETTINGS - see description below */
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

    // HTML dialog element has a built-in cancel() method
    this.elements.cancel.addEventListener('click', () => { 
      this.dialog.dispatchEvent(new Event('cancel')) 
    })
    
    /* call toggle() at the end of `init`: */
    this.toggle()
  }

  
  // to hide the HTML dialog element for browsers that do not support it
  toggle(open = false) {
    if (this.dialogSupported && open) this.dialog.showModal()
    if (!this.dialogSupported) {
      document.body.classList.toggle(this.settings.bodyClass, open)
      this.dialog.hidden = !open
      /* If a `target` exists, set focus on it when closing */
      if (this.elements.target && !open) {
        this.elements.target.focus()
      }
    }
  }

  // to trap focus so that the user can tab between the buttons in the dialog without inadvertently exiting the dialog
  getFocusable() {
    return [...this.dialog.querySelectorAll('button,[href],select,textarea,input:not([type=&quot;hidden&quot;]),[tabindex]:not([tabindex=&quot;-1&quot;])')]
  }


}// END_OF__class_Dialog
