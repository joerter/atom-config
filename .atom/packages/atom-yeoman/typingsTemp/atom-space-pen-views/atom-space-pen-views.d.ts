// Type definitions for atom-space-pen-views (v2.0.5)
// Project: https://github.com/atom/atom-space-pen-views
// Definitions by: david-driscoll <https://github.com/david-driscoll/>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

// Generated by: https://github.com/david-driscoll/atom-typescript-generator
// Generation tool by david-driscoll <https://github.com/david-driscoll/>
/// <reference path="../space-pen/space-pen.d.ts" />
declare module AtomSpacePenViews {
    /**
     * Represents a view that scrolls.
     */
    export class ScrollView extends SpacePen.View {
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        initialize() : any;
    
    }

    /**
     * SelectListView
     * This class was not documented by atomdoc, assume it is private. Use with caution.
     */
    export class SelectListView extends SpacePen.View {
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        static content() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        maxItems: any /* default */;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        scheduleTimeout: any /* default */;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        inputThrottle: any /* default */;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        cancelling: any /* default */;
    
        /**
         * Initialize the select list view.
         * 
         * This method can be overridden by subclasses but `super` should always
         * be called. 
         */
        initialize() : any;
    
        /**
         * Create a view for the given model item.
         * 
         * This method must be overridden by subclasses.
         * 
         * This is called when the item is about to appended to the list view.
         * @param item? - The model item being rendered. This will always be one of the items previously passed to {::setItems}.
        Returns a String of HTML, DOM element, jQuery object, or View.
         */
        viewForItem(item? : any) : any;
    
        /**
         * Callback function for when an item is selected.
         * 
         * This method must be overridden by subclasses.
         * @param item? - The selected model item. This will always be one of the items previously passed to {::setItems}.
        Returns a DOM element, jQuery object, or {View}.
         */
        confirmed(item? : any) : SpacePen.View;
    
        /**
         * Set the array of items to display in the list.
         * 
         * This should be model items not actual views. {::viewForItem} will be
         * called to render the item when it is being appended to the list view.
         * @param items? - The {Array} of model items to display in the list (default: []). 
         */
        setItems(items? : any[]) : void;
    
        /**
         * Get the model item that is currently selected in the list view.
        Returns a model item.
         */
        getSelectedItem() : any;
    
        /**
         * Get the property name to use when filtering items.
         * 
         * This method may be overridden by classes to allow fuzzy filtering based
         * on a specific property of the item objects.
         * 
         * For example if the objects you pass to {::setItems} are of the type
         * `{"id": 3, "name": "Atom"}` then you would return `"name"` from this method
         * to fuzzy filter by that property when text is entered into this view's
         * editor.
        Returns the property name to fuzzy filter by.
         */
        getFilterKey() : any;
    
        /**
         * Get the filter query to use when fuzzy filtering the visible
         * elements.
         * 
         * By default this method returns the text in the mini editor but it can be
         * overridden by subclasses if needed.
        Returns a {String} to use when fuzzy filtering the elements to display.
         */
        getFilterQuery() : string;
    
        /**
         * Set the maximum numbers of items to display in the list.
         * @param maxItems? - The maximum {Number} of items to display. 
         */
        setMaxItems(maxItems? : number) : void;
    
        /**
         * Populate the list view with the model items previously set by
         * calling {::setItems}.
         * 
         * Subclasses may override this method but should always call `super`. 
         */
        populateList() : any;
    
        /**
         * Set the error message to display.
         * @param message? - The {String} error message (default: ''). 
         */
        setError(message? : string) : void;
    
        /**
         * Set the loading message to display.
         * @param message? - The {String} loading message (default: ''). 
         */
        setLoading(message? : string) : void;
    
        /**
         * Get the message to display when there are no items.
         * 
         * Subclasses may override this method to customize the message.
         * @param itemCount? - The {Number} of items in the array specified to {::setItems}
         * @param filteredItemCount? - The {Number} of items that pass the fuzzy filter test.
        Returns a {String} message (default: 'No matches found').
         */
        getEmptyMessage(itemCount? : number, filteredItemCount? : number) : string;
    
        /**
         * Cancel and close this select list view.
         * 
         * This restores focus to the previously focused element if
         * {::storeFocusedElement} was called prior to this view being attached. 
         */
        cancel() : any;
    
        /**
         * Focus the fuzzy filter editor view. 
         */
        focusFilterEditor() : any;
    
        /**
         * Store the currently focused element. This element will be given
         * back focus when {::cancel} is called. 
         */
        storeFocusedElement() : any;
    
        /**
         * Private
         * This field or method was marked private by atomdoc. Use with caution.
         */
        selectPreviousItemView() : SpacePen.View;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        selectNextItemView() : SpacePen.View;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        selectItemView(view? : SpacePen.View) : SpacePen.View;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        scrollToItemView(view? : SpacePen.View) : SpacePen.View;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        restoreFocus() : any;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        getSelectedItemView() : SpacePen.View;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        confirmSelection() : Atom.Selection;
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        schedulePopulateList() : any;
    
    }

    /**
     * TextEditorView
     * This class was not documented by atomdoc, assume it is private. Use with caution.
     */
    export class TextEditorView extends SpacePen.View {
        /**
         * The constructor for setting up an `TextEditorView` instance. 
         * This field or method was marked private by atomdoc. Use with caution.
         */
        constructor(params? : any);
    
        /**
         * This field or method was not documented by atomdoc, assume it is private. Use with caution.
         */
        setModel(model? : Atom.Model) : void;
    
        /**
         * Get the underlying editor model for this view.
         */
        getModel() : Atom.Model;
    
        /**
         * Get the text of the editor.
         */
        getText() : string;
    
        /**
         * Set the text of the editor as a `String`. 
         */
        setText(text? : string) : void;
    
        /**
         * Determine whether the editor is or contains the active element.
        Returns a `Boolean`.
         */
        hasFocus() : any;
    
    }

}
declare module "atom-space-pen-views" {
    class ScrollView extends AtomSpacePenViews.ScrollView {}
    class SelectListView extends AtomSpacePenViews.SelectListView {}
    class TextEditorView extends AtomSpacePenViews.TextEditorView {}
    class View extends SpacePen.View {}
    var jQuery : JQueryStatic;
    var $ : JQueryStatic;
    function $$(fn: Function): JQuery;
    function $$$(fn: Function): Node;
}
