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
        $(document).on('keypress', function(e) {
            var key = e.which;
            if (key === 13) {
                var $inputs = $('table.dataTable tr.editing input'),
                $row = $inputs.closest('tr'),
                $table = $row.closest('table'),
                $form = $table.closest('form'),
                dt = $table.DataTable();

                if ($inputs.filter(function() {return $(this).val()}).length == 0) {
                    $row.remove();
                    return;
                }

                if ($table.find('tr.editing').length > 0 && $inputs.length > 0 && ($form.length === 0 || $form.valid())) {
                    dt.settings()[0]._editable._callSaveHandler(dt, $row);
                }
            }
        });
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
    _callSaveHandler: function(dt, $row) {
        var $form = $row.closest('form'),
            $cells = $row.find('td'),
            rowData = {},
            rowIdx = 0,
            $table = $(dt.table().node());

        // Make sure there are inputs to save
        if ( $('input', $table).length < 1 )
        {
            return;
        }

        // Make sure the form is valid
        if ( $form.length == 0 || $form.valid() ) {

            if (dt.row($row).node() == null) {
                var aoColumns = dt.settings()[0].aoColumns,
                    visibleCount = 0,
                    $td = $row.find('td');
                $.each(aoColumns, function(key, value) {
                    var jsonValue = (value.bVisible) ? $td.eq(visibleCount).find('input').val() : null;
                    rowData[value.mData] = jsonValue;
                    visibleCount++;
                });

                var row = dt.row.add(rowData),
                    rowIdx = row.index();
            } else {
                    rowData = dt.row($row).data(),
                    rowIdx = dt.row($row).index();

                $cells.each( function() {
                    var cell = dt.cell(this),
                        $input = $(cell.node()).find('input'),
                        jsonProp = dt.settings()[0].aoColumns[dt.cell(this).index().column].mData,
                        jsonValue = ( $input.length != 0 ) ? $input.val() : cell.data();

                    rowData[jsonProp] = jsonValue;
                });

                dt.row($row).data(rowData);
            }

            dt.draw();

            // Trigger a save event that users can hook into and pass all data in it
            $(dt.table().node()).trigger({
                type: 'save.dataTableEditable',
                rowIndex: rowIdx,
                rowData: rowData
            });

            // Remove class 'editing' from the row
            $row.removeClass('editing');
        }
    },
    _isEditable: function(dt, $cell) {
        var cellIdx = dt.cell($cell).index().column;

        return dt.settings()[0].aoColumns[cellIdx].editable || $(dt.table().header()).find('th').eq(cellIdx).attr('data-editable') == true;
    },
    _getRowTemplate: function(dt, $row, isNew) {
        var editable = this;

        if (typeof isNew == 'undefined') {
            isNew = false;
        }

        // Get each td and convert it to a input based on the data-input-type attribute on the corresponding th
        $row.find('td').each(function(key, value) {
            var $cell = $(this),
                $th = $(dt.table().header()).find('th').eq(key);

            if ( isNew || editable._isEditable(dt, $cell) ) {
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
    },
    _setFocus: function(dt, $row, $cell) {
        // Set focus to the clicked on cells input if it is editable
        // otherwise set focus to the first editable cell in the row
        if ( typeof $cell != 'undefined' && this._isEditable(dt, $cell) ) {
            $cell.find('input').focus();
        } else {
            $row.find('input').eq(0).focus();
        }
    },
    _callDefaultEditHandler: function($cell, $row, $table) {
        // If we are already editing one row then save it before we edit another
        var $inputs = $('input', $table),
            dt = $table.DataTable(),
            editable = this;

        if ($inputs.length > 0 && ($inputs.closest('form').length == 0 || !$inputs.valid())) {
            return;
        }

        $row.trigger('click.dataTableEditable');

        // Get row template
        this._getRowTemplate(dt, $row);

        // Set class 'editing' to the row so we can find it easier
        $row.addClass('editing');

        this._setFocus(dt, $row, $cell);
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
        var $table = $(dt.table().node()),
            $header = $(dt.table().header()),
            $row = $("<tr></tr>");

        // If there is already a row being edited then return early
        if ($('tr.editing', $table).length > 0) {
            //dt.settings()[0]._editable._callSaveHandler(dt, $('tr.editing', $table));
            return;
        }

        $header.find('th').each(function(key, value) {
            $row.append("<td></td>");
        });

        $row.addClass('editing');

        $table.find('tbody').prepend($row);
        this._getRowTemplate(dt, $row, true);
        this._setFocus(dt, $row);
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
    var $table = $(this).closest('table'),
        dtSettings = $table.DataTable().settings()[0];

    if ($.fn.DataTable.isDataTable( $table ) && dtSettings._editable)
    {
        var $cell = $(this),
            $row = $cell.closest('tr');

        if ( $table.attr('data-action-edit') ) {
            dtSettings._editable._callUserDefinedEditHandler($cell, $row, $table);
        } else {
            dtSettings._editable._callDefaultEditHandler($cell, $row, $table);
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
