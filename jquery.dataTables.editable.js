/*! Editable 0.0.1  
* Â©2014 Aron Kerr - datatables.net/license
*/

/**
 * @summary     Editable
 * @description In cell editing for datatables
 * @version     0.0.1
 * @file        jquery.dataTables.editable.js
 * @author      Aron Kerr (https://github.com/aronkerr)
 * @contact     www.linkedin.com/in/aronkerr
 * @copyright   Copyright 2014 Aron Kerr
 *
 * This source file is free software, available under the following license:
 *   MIT license - http://datatables.net/license/mit
 *
 * This source file is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE. See the license files for details.
 *
 * For details please refer to: http://www.datatables.net
*/

(function (window, document) {
"use strict";    
var factory = function( $, DataTable ) {
        
/**
 * Editable adds the ability to edit datatable cell data by adding inputs to allowed
 * cells when clicking on a row within the table. It allows the user to easily edit
 * the table data source.
 *
 * Editable can be initialsed in a number of ways.
 * Add editable: true to the table settings object or default datatable settings object.
 * @example
 *      $('#example').dataTable( {
 *          "editable": true,
 *      } );
 * 
 * Add the class 'editable' or 'dt-editable' to the tables html
 * @example
 *      <table id="example" class="display editable" cellspacing="0" width="100%"></table>
 *
 * Add the data attribute 'data-editable = true' to the tables html
 * @example
 *      <table id="example" class="display" data-editable="true" cellspacing="0" width="100%"></table>
 *
 *  @class
 *  @constructor
 *  @global
 *  @param {object} dt DataTables settings object
 *  @param {object} [init={}] Configuration object for Editable. Options 
 *    are defined by {@link Editable.defaults}
 *
 *  @requires jQuery 1.7+
 *  @requires DataTables 1.10.1+
 */
var Editable = function(dt, init) {
    var that = this;
    
    // Sanity check
    // Check that we are using DataTables 1.10.1 or newer
    if ( ! DataTable.versionCheck || ! DataTable.versionCheck( '1.10.1' ) ) 
    {
		throw 'DataTables Editable requires DataTables 1.10.1 or newer';
	}
    
    // Check if Editable has already been initialised on this table
    if ( dt.editable ) 
    {
		return;
	}
    
    // If settings weren't passed in define them just to be safe
    if ( typeof init == 'undefined' ) 
    {
        init = {};   
    }
    
    // Use the DataTables Hungarian notation mapping method, if it exists to
	// provide forwards compatibility for camel case variables
    if ($.fn.DataTable.camelToHungarian) {
        $.fn.DataTable.camelToHungarian(Editable.defaults, init);
    }
    
    // v1.10 allows the settings object to be got form a number of sources
    var dtSettings = $.fn.DataTable.Api ? new $.fn.DataTable.Api(dt).settings()[0] : dt.settings();   
    
    // Attach the instance to the DataTables instance so it can be accessed easily
    dtSettings._editable = this;
    
    // Build it
    if ( ! dtSettings._bInitComplete ) 
    {
        dtSettings.oApi._fnCallbackReg(dtSettings, 'aoInitComplete', function() {
            that._construct(init);   
        });
    } 
    else 
    {
        this._construct(init);
    }
}; // /Editable
        
Editable.prototype = {
    /**
	 * Initialisation for Editable
	 *  @returns {void}
	 *  @private
	 */
    _construct: function(init) {
        
    },
    /**
	 *  Get the data currently contained in the inputs of the row currently
     *  being edited and save the values to the datatable data source. Change
     *  the edited cells back to a normal datatable cell without inputs.
     *  @event save.dataTableEditable Triggers and passes the row index and the
     *      new row data.
     *  @event click.dataTableEditable Removes event listener.
	 *  @returns {void}
	 *  @private
	 */
    _callSaveHandler: function($row, $table) {
        var $form = $row.closest('form'),
            $cells = $row.find('td'),
            dt = $row.closest('table').DataTable(),
            rowData = dt.row($row).data(),
            rowIdx = dt.row($row).index();
        
        // Make sure there are inputs to save
        if ( $('input', $table).length < 1 ) 
        {
            return;
        }
        
        // Make sure the form is valid
        if ( $form.length == 0 || $form.valid() ) {
            var updateData = $cells.map( function() {
                var cell = dt.cell(this),
                    $input = $(cell.node()).find('input'),
                    jsonProp = dt.settings()[0].aoColumns[dt.cell(this).index().column].mData,
                    jsonValue = ( $input.length != 0 ) ? $input.val() : cell.data();
                
                rowData[jsonProp] = jsonValue;
            });
            
            var data = dt.row($row).data(rowData);
            dt.draw();
            
            // Trigger a save event that users can hook into and pass all data in it
            $(dt.table().node()).trigger({
                type: 'save.dataTableEditable',
                rowIndex: rowIdx,
                rowData: rowData
            });
            
            // Detach the editable click event listener
            $(document).off('click.dataTableEditable');
        }
    },
    /**
    * Determines if a cell can be edited. It will return true if the column has the setting
    * editable = true or if the <th> for the column has data-editable = true. By adding the 
    * class 'noEdit' to a <td> you can override this for a specific cell.
    */
    _isEditable: function($cell) {
        var $table = $cell.closest('table');
        
        if ( $.fn.DataTable.isDataTable($table) ) {
            var dt = $table.DataTable(),
                cellIdx = dt.cell($cell).index().column;
            return (dt.settings()[0].aoColumns[cellIdx].editable || $(dt.table().header()).find('th').eq(cellIdx).attr('data-editable') == true) && !$cell.hasClass('noEdit');
        }
        
        return false;
    },
    _getRowTemplate: function($row, isNew) {
        var editable = this,
            $table = $row.closest('table');
        
        if (isNew == true) {
            var $thead = $table.find('th');
            $thead.each(function(key, value) {
               var $th = $(value),
                   template = ($th && $th.attr('data-template')) ? $($th.attr('data-template')) : $('<input type="text" class="span12" value="">'),
                   $cell = $('<td></td>');
                
                $cell.html(template);
                $row.append($cell);
            });
        } else {
            // Get each td and convert it to a input based on the data-input-type attribute on the corresponding th
            $row.find('td').each(function(key, value) {
                var $cell = $(this),
                    $th = $(dt.table().header()).find('th').eq(key);

                if ( editable._isEditable($cell) ) {
                    var template = ($th && $th.attr('data-template')) ? $($th.attr('data-template')) : $('<input type="text" class="span12" value="">'),
                        $html;

                    if (template.is('input')) {
                        $html = template.val($cell.text());
                    } else {
                        template.find('input').val($cell.text());
                        $html = template;
                    }

                    $cell.html($html);  
                }
            });
        }
    },
    _callDefaultEditHandler: function($cell, $row, $table) {
        // If we are already editing one row then save it before we edit another
        var $inputs = $('input', $table),
            $tr = $inputs.closest('tr'),
            dt = $table.DataTable();

        if ($inputs.length > 0 && ($inputs.closest('form').length == 0 || !$inputs.valid())) {
            return;
        }
        $tr.trigger('edit.dataTableEditable');

        // Get each td and convert it to a input based on the data-input-type attribute on the corresponding th
        this._getRowTemplate($row);
        
        // Set focus to the clicked on cells input if it is editable 
        // otherwise set focus to the first editable cell in the row
        if ( this._isEditable($cell) ) {
            $cell.find('input').focus();
        } else {
            $cell.closest('tr').find('input').eq(0).focus();
        }
        
        // Attach an event listener so we can know when we click outside of the row
        $(document.body).on('click.dataTableEditable', function(event) {
            var $inputs = $('table.dataTable input'),
                $row = $inputs.closest('tr'),
                $table = $row.closest('table'),
                $eventTarget = $(event.target);
            if ( $inputs.length > 0 && $row.has($eventTarget).length < 1) {
                if ($eventTarget.is('td, tr, th') && $eventTarget.closest('table').length == 0) {
                    return;
                }
                
                $table.DataTable().settings()[0]._editable._callSaveHandler($row, $table);
            }
        });
    },
    _callUserDefinedEditHandler: function($cell, $row, $table) {
            var namespaces = $table.attr('data-action-edit').split('.'),
            editHandler = namespaces.pop();
        
        for ( var i = 0; i < namespaces.length; i++ )
        {
            context = window[namespaces[i]];   
        }
        
        // Call the edit handler function
        context[editHandler].call(this, $row, $table);
    },
    _addRow: function(dt) {
        
        // Attach an event listener so we can know when we click outside of the row
        $(document.body).on('click.dataTableEditable', function(event) {
            var $inputs = $('table.dataTable input'),
                $row = $inputs.closest('tr'),
                $table = $row.closest('table'),
                $eventTarget = $(event.target);
            if ( $inputs.length > 0 && $row.has($eventTarget).length < 1) {
                if ($eventTarget.is('td, tr, th') && $eventTarget.closest('table').length == 0) {
                    return;
                }
                
                console.log('add new row');
                //$table.DataTable().settings()[0]._editable._callSaveHandler($row, $table);
            }
        }); 
        
        var $row = $('<tr></tr>');
        
        $(dt.table().node()).prepend($row);
        
        this._getRowTemplate($row, true);    
    },
    _editCell: function($cell, $row, $table) {    
        if ( $table.attr('data-action-edit') ) {
            this._callUserDefinedEditHandler($cell, $row, $table);
        } else {
            this._callDefaultEditHandler($cell, $row, $table);
        } 
    }
}; // /Editable.prototype
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Statics
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
Editable.defaults = {};
        
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Constants
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
Editable.version = "0.0.1";
        
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Initialisation
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */ 
    
// Attach Editable to DataTables so it can be accessed as an 'extra'
$.fn.DataTable.Editable = Editable;
$.fn.dataTable.Editable = Editable;

// DataTables 1.10 API method aliases
if ( $.fn.DataTable.Api ) 
{
    var Api = $.fn.DataTable.Api;
    
    Api.register('editable()', function() {
        return this;
    });
    
    Api.register('editable().addRow()', function() {
        var dtSettings = this.settings()[0]; 
        
        if (dtSettings._editable) {
            dtSettings._editable._addRow(this);
        }
    });
}

// Attach event listeners
$(document).on('click', 'table.dataTable tr:gt(0) td:not(:has("input"))', function(e) {
    var $cell = $(this),
        $row = $cell.closest('tr'),
        $table = $cell.closest('table');
    
    if ( $.fn.DataTable.isDataTable( $table ) ) {
        var dtSettings = $table.DataTable().settings()[0];
        if ( dtSettings._editable ) {
            dtSettings._editable._editCell($cell, $row, $table);
        }        
    }
});

// Attach a listener to the document which listens for DataTables initialisation
// events so we can automatically initialise
$(document).on( 'init.dt.dtr', function (e, settings, json) {
	if ( $(settings.nTable).hasClass( 'editable' ) ||
		 $(settings.nTable).hasClass( 'dt-editable' ) ||
         $(settings.nTable).attr( 'data-editable' ) == true ||
		 settings.oInit.editable ||
		 DataTable.defaults.editable
	) {
		var init = settings.oInit.editable;

		if ( init !== false ) {
			new Editable( settings, $.isPlainObject( init ) ? init : {}  );
		}
	}
});
    
return Editable;
}; // /factory
    
// Define as an AMD module if possible
if ( typeof define === 'function' && define.amd ) {
	define( ['jquery', 'datatables'], factory );
}
else if ( typeof exports === 'object' ) {
    // Node/CommonJS
    factory( require('jquery'), require('datatables') );
}
else if ( jQuery && !jQuery.fn.dataTable.Editable ) {
	// Otherwise simply initialise as normal, stopping multiple evaluation
	factory( jQuery, jQuery.fn.dataTable );
}
    
})(window, document);