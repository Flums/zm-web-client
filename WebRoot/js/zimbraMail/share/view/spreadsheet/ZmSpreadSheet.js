/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.1
 *
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 *
 * The Original Code is: Zimbra Collaboration Suite.
 *
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2005 Zimbra, Inc.
 * All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK *****
 */

/**
 * A SpreadSheet Widget.
 * @author Mihai Bazon, <mihai@zimbra.com>
 */
function ZmSpreadSheet(parent, className, posStyle, deferred) {
	if (arguments.length == 0)
		return;
	className = className || "ZmSpreadSheet";
	DwtComposite.call(this, parent, className, posStyle, deferred);

	// WARNING: the mousemove handler is a crazy workaround to the fact
	// that the range DIV blocks events from reaching the table element.
	// So upon mouseover, we hide it for about 10 milliseconds; during this
	// timeout the table will catch on mouseover-s.  Produces a short
	// flicker :-(  I donno how to work around this...
	var footimeout = null;
	this._selectRangeCapture = new DwtMouseEventCapture(
		this, "ZmSpreadSheet",
		ZmSpreadSheet.simpleClosure(this._table_mouseOver, this),
		null,		// no mousedown

// 		// mousemove handler (see warning above)
// 		ZmSpreadSheet.simpleClosure(function(ev) {
// 			var self = this;
// 			if (footimeout)
// 				clearTimeout(footimeout);
// 			footimeout = setTimeout(function() {
// 				self._getRangeDiv().style.display = "none";
// 				setTimeout(function() {
// 					self._getRangeDiv().style.display = "";
// 				}, 1);
// 			}, 50);
// 		}, this),

		null, // for now

		ZmSpreadSheet.simpleClosure(this._clear_selectRangeCapture, this),
		null,		// no mouseout?
		true);		// hard capture

// 	this.ROWS = 5;
// 	this.COLS = 5;

// 	this._init();
};

// custom HTML attributes for our data
// ZmSpreadSheet.ATTR = {
// 	EDIT  : "ZmSpreadSheet-edit",    // the value edited by the end-user
// 	VALUE : "ZmSpreadSheet-value"    // the computed value (which is actually displayed)
// };

ZmSpreadSheet.prototype = new DwtComposite;
ZmSpreadSheet.prototype.construction = ZmSpreadSheet;

ZmSpreadSheet.getCellName = function(td) {
	return ZmSpreadSheetModel.getCellName(td.parentNode.rowIndex, td.cellIndex);
};

ZmSpreadSheet.prototype.setModel = function(model) {
	model.reset();
	this._model = model;
	this._init();

//	model.setViewListener("onCellEdit", new AjxCallback(this, this._model_cellEdited));
	model.setViewListener("onCellValue", new AjxCallback(this, this._model_cellComputed));
	model.setViewListener("onInsertRow", new AjxCallback(this, this._model_insertRow));
	model.setViewListener("onInsertCol", new AjxCallback(this, this._model_insertCol));
	model.setViewListener
};

ZmSpreadSheet.prototype._model_cellEdited = function(row, col, cell) {
	var td = this._getTable().rows[row].cells[col];
	cell.setToElement(td);
};

ZmSpreadSheet.prototype._model_cellComputed = function(row, col, cell) {
	var td = this._getTable().rows[row].cells[col];
	cell.setToElement(td);
};

ZmSpreadSheet.prototype._model_insertRow = function(cells, rowIndex) {
	this._hideRange();
	var selected = this._selectedCell;
	this._selectCell();
	var rows = this._getTable().rows;
	var row = this._getTable().insertRow(rowIndex + 1); // add 1 to skip the header row
	// (1) update numbering in the left-bar header
	var is_last_row = true;
	for (var i = row.rowIndex; i < rows.length - 1; ++i) {
		var node = rows[i + 1].firstChild;
		var tmp = node;
		if (i == rows.length - 2) {
			node = node.cloneNode(true);
			tmp.firstChild.innerHTML = i + 1;
		}
		rows[i].insertBefore(node, rows[i].firstChild);
		is_last_row = false;
	}
	if (is_last_row) {
		var td = row.insertCell(0);
		td.className = "LeftBar";
		td.innerHTML = "<div>" + (rowIndex + 1) + "</div>";
	}
	// (2) create element cells and inform the model cells about them
	for (var i = 0; i < cells.length; ++i) {
		var td = row.insertCell(i + 1);
		td.className = "cell";
		cells[i]._td = td;
		cells[i].setToElement(td);
	}
	this._selectCell(selected);
};

ZmSpreadSheet.prototype._model_insertCol = function(cells, colIndex) {
	this._hideRange();
	var selected = this._selectedCell;
	this._selectCell();
	var rows = this._getTable().rows;
	// (1) update labels in the top-bar header
	var row = rows[0];
	var td = row.insertCell(colIndex + 1);
	td.innerHTML = "<div></div>";
	for (var i = colIndex + 1; i < row.cells.length; ++i)
		row.cells[i].firstChild.innerHTML = ZmSpreadSheetModel.getColName(i);
	// (2) create element cells and inform the model cells about them
	for (var i = 0; i < cells.length; ++i) {
		row = rows[i + 1];
		var td = row.insertCell(colIndex + 1);
		td.className = "cell";
		td.innerHTML = "&nbsp;";
		cells[i]._td = td;
		cells[i].setToElement(td);
	}
	this._selectCell(selected);
};

ZmSpreadSheet.prototype.getCellModel = function(td) {
	return this._model.getCell(td.parentNode.rowIndex, td.cellIndex);
};

ZmSpreadSheet.prototype._init = function() {
	this._relDivID = Dwt.getNextId();
	this._focusLinkID = Dwt.getNextId();

	var html = [ "<div id='", this._relDivID,
		     "' style='position: relative'><table cellspacing='1' cellpadding='0' border='0'>" ];
	var row = [ "<tr><td class='LeftBar'></td>" ];

	var ROWS = this._model.ROWS;
	var COLS = this._model.COLS;

	this._inputFieldID = null;
	this._spanFieldID = null;

	for (var i = COLS; --i >= 0;)
		row.push("<td class='cell'>&nbsp;</td>");
	row.push("</tr>");

	row = row.join("");

	// one more row for the header
	for (var i = ROWS; i-- >= 0;)
		html.push(row);
	html.push("</table></div>");

	var div = this.getHtmlElement();
	div.innerHTML = html.join("");
	var table = this._getTable();
	table.rows[0].className = "TopBar";
	table.rows[0].cells[0].className = "TopLeft";

	// the "focus link" is our clever way to receive key events when the
	// "spreadsheet" is focused.  As usual, it requires some special bits
	// for IE (needs to have a href and some content in order to be
	// focusable).  It looks better in FF without these special bits.
	html = [ "<a id='", this._focusLinkID, "'" ];
	if (AjxEnv.isIE)
		html.push(" href='#' onclick='return false'");
	html.push(">");
	if (AjxEnv.isIE)
		html.push("&nbsp;");
	html.push("</a>");
	table.rows[0].cells[0].innerHTML = html.join("");

	for (var i = 1; i < table.rows.length; ++i)
		table.rows[i].cells[0].innerHTML = "<div>" + i + "</div>";
	row = table.rows[0];
	for (var i = 1; i < row.cells.length; ++i)
		row.cells[i].innerHTML = "<div>" + ZmSpreadSheetModel.getColName(i) + "</div>";

	for (var i = 0; i < ROWS; ++i) {
		var row = table.rows[i + 1];
		for (var j = 0; j < COLS; ++j) {
			var mc = this._model.data[i][j];
			mc.setToElement(mc._td = row.cells[j + 1]);
		}
	}

	table.onmouseup = ZmSpreadSheet.simpleClosure(this._table_onMouseUp, this);
	table.onmousedown = ZmSpreadSheet.simpleClosure(this._table_onClick, this);
	table.onclick = ZmSpreadSheet.simpleClosure(this._table_onClick, this);
	table.ondblclick = ZmSpreadSheet.simpleClosure(this._table_onClick, this);

	var link = this._getFocusLink();
	link.onkeypress = ZmSpreadSheet.simpleClosure(this._focus_keyPress, this);
	if (AjxEnv.isIE || AjxEnv.isOpera)
		link.onkeydown = link.onkeypress;
};

// called when a cell from the top header was clicked or mousedown
ZmSpreadSheet.prototype._topCellClicked = function(td, ev) {
	if (/click/i.test(ev.type)) {
		var col = td.cellIndex;
		this._selectCell(this._getTable().rows[td.parentNode.rowIndex + 1].cells[col]);
		var col = ZmSpreadSheetModel.getColName(col);
		var c1 = col + "1";
		var c2 = col + this._model.ROWS;
		this._selectRange(c1, c2);
	}
};

// called when a cell from the left header was clicked or mousedown
ZmSpreadSheet.prototype._leftCellClicked = function(td, ev) {
	if (/click/i.test(ev.type)) {
		var row = td.parentNode.rowIndex;
		this._selectCell(this._getTable().rows[row].cells[td.cellIndex + 1]);
		var c1 = "A" + row;
		var c2 = ZmSpreadSheetModel.getColName(this._model.COLS) + row;
		this._selectRange(c1, c2);
	}
};

// called when the top-left cell was clicked or mousedown (TODO: do we do anything here?)
ZmSpreadSheet.prototype._topLeftCellClicked = function(td, ev) {
};

// called for all other cells; normally we display an input field here and
// allow one to edit cell contents
ZmSpreadSheet.prototype._cellClicked = function(td, ev) {
	var is_mousedown = /mousedown/i.test(ev.type);
	this._hideRange();
	this._selectCell(td);
	if (is_mousedown) {
		ev._stopPropagation = true;
		ev._returnValue = false;
		this._selectRangeCapture.capture();
		if (this._editingCell && this._hasExpression)
			this._updateCellRangeToken();
		else
			this.focus();
	}
	if (/dblclick/i.test(ev.type)) {
		ev._stopPropagation = true;
		ev._returnValue = false;
		this._editCell(td);
	}
};

ZmSpreadSheet.prototype.focus = function() {
	// this link will intercept keybindings.  Clever, huh? B-)
	this._getFocusLink().focus();
	window.status = ""; // Clear the statusbar for IE's smart ass
};

ZmSpreadSheet.prototype._getTopLeftCell = function() {
	return this._getTable().rows[0].cells[0];
};

ZmSpreadSheet.prototype._getTopHeaderCell = function(td) {
	return this._getTable().rows[0].cells[td.cellIndex];
};

ZmSpreadSheet.prototype._getLeftHeaderCell = function(td) {
	return this._getTable().rows[td.parentNode.rowIndex].cells[0];
};

ZmSpreadSheet.prototype._selectCell = function(td) {
	if (this._selectedCell) {
		Dwt.delClass(this._getTopHeaderCell(this._selectedCell), "TopSelected");
		Dwt.delClass(this._getLeftHeaderCell(this._selectedCell), "LeftSelected");
		Dwt.delClass(this._selectedCell, "Selected");
	}
	this._selectedCell = td;
	if (td) {
		Dwt.addClass(td, "Selected");
		Dwt.addClass(this._getTopHeaderCell(td), "TopSelected");
		Dwt.addClass(this._getLeftHeaderCell(td), "LeftSelected");
		// this._getTopLeftCell().innerHTML = ZmSpreadSheet.getCellName(td);
	}
};

ZmSpreadSheet.prototype._getRelDiv = function() {
	return document.getElementById(this._relDivID);
};

ZmSpreadSheet.prototype._getFocusLink = function() {
	return document.getElementById(this._focusLinkID);
};

ZmSpreadSheet.prototype._getInputField = function() {
	var input = null;
	if (this._inputFieldID)
		input = document.getElementById(this._inputFieldID);
	if (!input) {
		var div = this._getRelDiv();
		input = document.createElement("input");
		this._inputFieldID = input.id = Dwt.getNextId();
		input.setAttribute("autocomplete", "off");
		input.type = "text";
		input.className = "InputField";
		input.style.left = "0px";
		input.style.top = "0px";
		input.style.visibility = "hidden";
		div.appendChild(input);

		// set event handlers
		input[(AjxEnv.isIE || AjxEnv.isOpera) ? "onkeydown" : "onkeypress"]
			= ZmSpreadSheet.simpleClosure(this._input_keyPress, this);
		// input.onmousedown = ZmSpreadSheet.simpleClosure(this._input_mouseUp, this);
		input.onmouseup = ZmSpreadSheet.simpleClosure(this._input_mouseUp, this);
		input.onblur = ZmSpreadSheet.simpleClosure(this._input_blur, this);
		input.onfocus = ZmSpreadSheet.simpleClosure(this._input_focus, this);
	}
	return input;
};

ZmSpreadSheet.prototype._getSpanField = function() {
	var span = null;
	if (this._spanFieldID)
		span = document.getElementById(this._spanFieldID);
	if (!span) {
		// we're using this hidden element in order to determine the
		// width of the input field while it is edited
		var span = document.createElement("span");
		this._spanFieldID = span.id = Dwt.getNextId();
		span.className = "InputField";
		var div = this._getRelDiv();
		div.appendChild(span);
	}
	return span;
};

ZmSpreadSheet.prototype._editCell = function(td) {
	var input = this._getInputField();
	if (this._editingCell)
		input.blur();
	if (td) {
		this._selectCell(td);
		input.style.visibility = "";
		input.style.top = td.offsetTop - 1 + "px";
		input.style.left = td.offsetLeft - 1 + "px";
		input.style.width = td.offsetWidth + 2 + "px";
		input.style.height = td.offsetHeight + 2 + "px";
		var mc = this.getCellModel(td);
		input.value = mc.getEditValue();
		input._caretMoved = false;
		input.select();
		input.focus();
		this._editingCell = td;
		mc.setStyleToElement(input);
		this._displayRangeIfAny();
		// quick hack to set the field size from the start
		this._input_keyPress();
	}
};

ZmSpreadSheet.prototype._input_blur = function(ev) {
	var input = this._getInputField();
	input.style.visibility = "hidden";
	input.style.left = 0;
	input.style.top = 0;
	input.style.width = "";
	if (!this._preventSaveOnBlur)
		this._save_value(input.value);
	this._editingCell = null;
	this._hideRange();
};

// In Firefox the input field loses focus when the whole document lost focus
// (i.e. tab change).  Then if you return to that tab, the input field regains
// focus but remains hidden in the top-left corner, so we re-edit the cell here
ZmSpreadSheet.prototype._input_focus = function(ev) {
	var input = this._getInputField();
	if (input.style.visibility == "hidden" && this._selectedCell)
		this._editCell(this._selectedCell);
};

ZmSpreadSheet.prototype._save_value = function(origval) {
	this.getCellModel(this._editingCell).setEditValue(origval);
};

ZmSpreadSheet.prototype._getNextCell = function(td) {
	if (td == null)
		td = this._editingCell || this._selectedCell;
	var row = td.parentNode;
	if (td.cellIndex < row.cells.length - 1)
		return row.cells[td.cellIndex + 1];
	var body = this._getTable();
	if (row.rowIndex < body.rows.length - 1)
		return body.rows[row.rowIndex + 1].cells[1];
	return null;
};

ZmSpreadSheet.prototype._getPrevCell = function(td) {
	if (td == null)
		td = this._editingCell || this._selectedCell;
	var row = td.parentNode;
	if (td.cellIndex > 1)
		return row.cells[td.cellIndex - 1];
	var body = this._getTable();
	if (row.rowIndex > 1) {
		row = body.rows[row.rowIndex - 1];
		return row.cells[row.cells.length - 1];
	}
	return null;
};

ZmSpreadSheet.prototype._getDownCell = function(td) {
	if (td == null)
		td = this._editingCell || this._selectedCell;
	var row = td.parentNode;
	var body = this._getTable();
	if (row.rowIndex < body.rows.length - 1) {
		row = body.rows[row.rowIndex + 1];
		return row.cells[td.cellIndex];
	}
	return null;
};

ZmSpreadSheet.prototype._getUpCell = function(td) {
	if (td == null)
		td = this._editingCell || this._selectedCell;
	var row = td.parentNode;
	var body = this._getTable();
	if (row.rowIndex > 1) {
		row = body.rows[row.rowIndex - 1];
		return row.cells[td.cellIndex];
	}
	return null;
};

ZmSpreadSheet.prototype._getRightCell = function(td) {
	if (td == null)
		td = this._editingCell || this._selectedCell;
	var row = td.parentNode;
	if (td.cellIndex < row.cells.length - 1)
		return row.cells[td.cellIndex + 1];
	return null;
};

ZmSpreadSheet.prototype._getLeftCell = function(td) {
	if (td == null)
		td = this._editingCell || this._selectedCell;
	var row = td.parentNode;
	if (td.cellIndex > 1)
		return row.cells[td.cellIndex - 1];
	return null;
};

ZmSpreadSheet.prototype._focus_handleKey = function(dwtev, ev) {
	var needs_keypress = AjxEnv.isIE || AjxEnv.isOpera;
	this.focus();
	var handled = true;
	switch (dwtev.keyCode) {
	    case 9: // TAB
		var td = dwtev.shiftKey
			? this._getPrevCell()
			: this._getNextCell();
		if (td)
			this._selectCell(td);
		break;

	    case 37: // LEFT
	    case 39: // RIGHT
		var td = dwtev.keyCode == 37
			? this._getLeftCell()
			: this._getRightCell();
		if (td)
			this._selectCell(td);
		break;

	    case 38: // UP
	    case 13: // ENTER
	    case 40: // DOWN
		var td = (dwtev.keyCode == 13
			  ? ( dwtev.shiftKey
			      ? this._getUpCell()
			      : this._getDownCell())
			  : ( dwtev.keyCode == 38
			      ? this._getUpCell()
			      : this._getDownCell()));
		if (td)
			this._selectCell(td);
		break;

	    case 113: // F2
		this._editCell(this._selectedCell);
		break;

	    case 46: // DEL
		if (this._selectedRangeName) {
			this._model.forEachCell(this._selectedRangeName,
						function(cell) {
							cell.clearValue();
						});
		}
		// the selected cell _can_ be outside the selected range. ;-)
		// let's clear that too.
		this.getCellModel(this._selectedCell).clearValue();
		break;

	    case 27:		// ignore ESC for IE
		break;

	    default:
		if ((!needs_keypress && ev.charCode)
		    || (needs_keypress && /keypress/i.test(dwtev.type))) {
			var val = String.fromCharCode(dwtev.charCode);
// 			// FIXME: this sucks.  Isn't there any way to determine
// 			// if some character is a printable Unicode character? :(
// 			if (/[`~\x5d\x5ba-zA-Z0-9!@#$%^&*(),.<>\/?;:\x22\x27{}\\|+=_-]/.test(val)) {
			this._editCell(this._selectedCell);
			// Workaround for IE: all codes reported are uppercase.
			// Should find something better. :-|
// 			if (AjxEnv.isIE && !dwtev.shiftKey)
// 				val = val.toLowerCase();
			this._getInputField().value = val;
			Dwt.setSelectionRange(this._getInputField(), 1, 1);
		} else
			handled = false;
	}
	if (handled) {
		dwtev._stopPropagation = true;
		dwtev._returnValue = false;
	}
	return handled;
};

ZmSpreadSheet.prototype._focus_keyPress = function(ev) {
	ev || (ev = window.event);
	var dwtev = new DwtKeyEvent();
	dwtev.setFromDhtmlEvent(ev);
	this._focus_handleKey(dwtev, ev);
	dwtev.setToDhtmlEvent(ev);
	return dwtev._returnValue;
};

ZmSpreadSheet.prototype._input_mouseUp = function() {
	this._displayRangeIfAny();
};

ZmSpreadSheet.prototype._input_keyPress = function(ev) {
	ev || (ev = window.event);
	var setTimer = true;
	if (ev) {
		var dwtev = new DwtKeyEvent();
		dwtev.setFromDhtmlEvent(ev);
		var input = this._getInputField();
		this._preventSaveOnBlur = true;	// we're saving manually when it's the case.
		switch (ev.keyCode) {

		    case 9: // TAB
			setTimer = false;
			this._save_value(input.value);
			input.blur();
			this._focus_handleKey(dwtev, ev);
			break;

		    case 37: // LEFT
		    case 39: // RIGHT
			var doit = ( !input._caretMoved &&
				     ( (Dwt.getSelectionStart(input) == 0 && dwtev.keyCode == 37) ||
				       (Dwt.getSelectionEnd(input) == input.value.length && dwtev.keyCode == 39) ) );
			if (doit || !input.value || ev.altKey) {
				setTimer = false;
				this._save_value(input.value);
				input.blur();
				this._focus_handleKey(dwtev, ev);
			} else
				input._caretMoved = true;
 			break;

		    case 38: // UP
		    case 13: // ENTER
		    case 40: // DOWN
			setTimer = false;
			this._save_value(input.value);
			input.blur();
			this._focus_handleKey(dwtev, ev);
			break;

		    case 27: // ESC
			setTimer = false;
			if (AjxEnv.isIE) {
				var mc = this.getCellModel(this._editingCell);
				input.value = mc.getEditValue();
			}
			this.focus();
			break;

		    case 113: // F2 -- select all
			Dwt.setSelectionRange(input, 0, input.value.length);
			break;

		}
		dwtev.setToDhtmlEvent(ev);
		this._preventSaveOnBlur = false;
	}
	if (setTimer) {
		if (this._input_keyPress_timer)
			clearTimeout(this._input_keyPress_timer);
		var self = this;
		this._input_keyPress_timer = setTimeout(function() {
			var span = self._getSpanField();
			var input = self._getInputField();
			span.innerHTML = "";
			span.appendChild(document.createTextNode(input.value));
			if (span.offsetWidth > (input.offsetWidth - 20))
				input.style.width = span.offsetWidth + 50 + "px";
			self._input_keyPress_timer = null;
			self._displayRangeIfAny();
		}, 10);
	} else
		this._hideRange();
};

ZmSpreadSheet.prototype._selectRange = function(c1, c2, showSingleCell) {
	this._selectedRangeName = null;
	var show = showSingleCell || (c1.toLowerCase() != c2.toLowerCase());
	c1 = ZmSpreadSheetModel.identifyCell(c1);
	c2 = ZmSpreadSheetModel.identifyCell(c2);
	if (show && c1 && c2) {
		var startRow = Math.min(c1.row, c2.row);
		var startCol = Math.min(c1.col, c2.col);
		var endRow   = Math.max(c1.row, c2.row);
		var endCol   = Math.max(c1.col, c2.col);
		this._showRange(startRow, startCol, endRow, endCol);
	} else
		this._hideRange();
};

ZmSpreadSheet.prototype._displayRangeIfAny = function() {
	var input = this._getInputField();
	this._hasExpression = /^=(.*)$/.test(input.value);
	if (!this._hasExpression) {
		// no formulae
		this._hideRange();
		return;
	}
	var expr = RegExp.$1;
	var
		selStart = Dwt.getSelectionStart(input),
		selEnd   = Dwt.getSelectionEnd(input);
	try {
		if (selStart > 0)
			--selStart;
		if (selEnd > 0)
			--selEnd;
		var tokens = ZmSpreadSheetFormulae.parseTokens(expr, true);	// don't throw
		var tok = null;
		for (var i = 0; i < tokens.length; ++i) {
			var tmp = tokens[i];
			if (tmp.strPos <= selStart &&
			    tmp.strPos + tmp.strLen >= selEnd &&
			    ( tmp.type === ZmSpreadSheetFormulae.TOKEN.CELL ||
			      tmp.type === ZmSpreadSheetFormulae.TOKEN.CELLRANGE )) {
				tok = tmp;
				break;
			}
		}
		this._rangeToken = tok;
		if (tok) {
			var c1, c2;
			if (tok.type === ZmSpreadSheetFormulae.TOKEN.CELL) {
				c1 = c2 = tok.val;
			}
			if (tok.type === ZmSpreadSheetFormulae.TOKEN.CELLRANGE) {
				var a = tok.val.split(/:/);
				c1 = a[0];
				c2 = a[1];
			}
			this._selectRange(c1, c2, true);
		} else
			throw "HIDE";
	} catch(ex) {
		this._hideRange();
	}
};

ZmSpreadSheet.prototype._showRange = function(startRow, startCol, endRow, endCol) {
	this._model.checkBounds(startRow, startCol);
	this._model.checkBounds(endRow, endCol);
	var r1 = this._getTable().rows[startRow + 1];
	var r2 = this._getTable().rows[endRow + 1];
	if (!r1 || !r2)
		this._hideRange();
	var c1 = r1.cells[startCol + 1];
	var c2 = r2.cells[endCol + 1];
	if (!c1 || !c2)
		this._hideRange();
	this._selectedRangeName = [ ZmSpreadSheet.getCellName(c1),
				    ZmSpreadSheet.getCellName(c2) ].join(":");
	// and we have the top-left cell in c1 and bottom-right cell in c2
	var div = this._getRangeDiv();
	var w = c2.offsetTop + c2.offsetHeight - c1.offsetTop;
	var h = c2.offsetLeft + c2.offsetWidth - c1.offsetLeft;
	if (AjxEnv.isIE) {
		w += 2;
		h += 2;
	}
	div.style.height = w + "px";
	div.style.width = h + "px";
	div.style.left = c1.offsetLeft - 1 + "px";
	div.style.top = c1.offsetTop - 1 + "px";
	div.style.visibility = "";
};

ZmSpreadSheet.prototype._getRangeDiv = function() {
	if (!this._rangeDivID)
		this._rangeDivID = Dwt.getNextId();
	var div = document.getElementById(this._rangeDivID);
	if (!div) {
		var div = document.createElement("div");
		div.id = this._rangeDivID;
		div.className = "ShowRange";
		this._getRelDiv().appendChild(div);
		div.style.visibility = "hidden";
		// at any move, we should hide the range display :-(
		// otherwise, elements below it won't be able to receive mouse clicks
		// div.onmousemove = ZmSpreadSheet.simpleClosure(this._hideRange, this);
		div.onmousedown = ZmSpreadSheet.simpleClosure(this._rangediv_mousedown, this);
	}
	return div;
};

ZmSpreadSheet.prototype._rangediv_mousedown = function(ev) {
	var dwtev = new DwtUiEvent(ev);
	dwtev.setFromDhtmlEvent(ev);
	this._hideRange();
	dwtev._stopPropagation = true;
	dwtev._returnValue = false;
	dwtev.setToDhtmlEvent(ev);
};

ZmSpreadSheet.prototype._hideRange = function() {
	this._selectedRangeName = null;
	var div = this._getRangeDiv();
	div.style.visibility = "hidden";
	// amazing performance improvement:
	div.style.top = "0px";
	div.style.left = "0px";
	div.style.width = "5px";
	div.style.height = "5px";
};

ZmSpreadSheet.prototype._table_mouseOver = function(ev) {
	var dwtev = new DwtMouseEvent();
	dwtev.setFromDhtmlEvent(ev);
	var table = this._getTable();
	var td = DwtUiEvent.getTarget(dwtev);
	while (td && td !== table && !/^td$/i.test(td.tagName))
		td = td.parentNode;
	if (td && /^td$/i.test(td.tagName)) {
		this._selectRange(ZmSpreadSheet.getCellName(this._selectedCell),
				  ZmSpreadSheet.getCellName(td), false);
		this._updateCellRangeToken();
	}
	dwtev._stopPropagation = true;
	dwtev._returnValue = false;
	dwtev.setToDhtmlEvent(ev);
	return dwtev._returnValue;
};

ZmSpreadSheet.prototype._updateCellRangeToken = function() {
	if (this._editingCell && this._hasExpression) {
		var val = this._selectedRangeName ||
			ZmSpreadSheet.getCellName(this._selectedCell);
		var input = this._getInputField();
		var tok = this._rangeToken;
		if (!tok) {
			tok = { strPos: Dwt.getSelectionStart(input) };
			tok.strLen = Dwt.getSelectionEnd(input) - tok.strPos;
			tok.strPos--;
		}
		Dwt.setSelectionRange(input, tok.strPos + 1, tok.strPos + tok.strLen + 1);
		tok.strLen = val.length;
		Dwt.setSelectionText(input, val);
		val = tok.strPos + tok.strLen + 1;
		Dwt.setSelectionRange(input, val, val);
		this._displayRangeIfAny();
	}
};

ZmSpreadSheet.prototype._clear_selectRangeCapture = function(ev) {
	this._selectRangeCapture.release();
	if (this._editingCell)
		this._selectCell(this._editingCell);
};

// hmm, do we ever get here?
ZmSpreadSheet.prototype._table_onMouseUp = function(ev) {
 	if (this._editingCell && !this._hasExpression)
 		// save & clear
 		this._getInputField().blur();
};

ZmSpreadSheet.prototype._table_onClick = function(ev) {
	var dwtev = new DwtMouseEvent();
	dwtev.setFromDhtmlEvent(ev);
	var table = this._getTable();
	var td = DwtUiEvent.getTarget(dwtev);
	while (td && td !== table && !/^td$/i.test(td.tagName))
		td = td.parentNode;
	if (td && /^td$/i.test(td.tagName)) {
		// cell found
		var tr = td.parentNode;
		if (tr.rowIndex == 0) {
			if (td.cellIndex == 0)
				this._topLeftCellClicked(td, dwtev);
			else
				this._topCellClicked(td, dwtev);
		} else if (td.cellIndex == 0)
			this._leftCellClicked(td, dwtev);
		else
			this._cellClicked(td, dwtev);
	}
	dwtev.setToDhtmlEvent(ev);
	return dwtev._returnValue;
};

ZmSpreadSheet.prototype._getTable = function() {
	return this._getRelDiv().firstChild;
};

ZmSpreadSheet.simpleClosure = function(func, obj) {
	return function() { return func.call(obj, arguments[0]); };
};
