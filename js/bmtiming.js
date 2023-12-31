// set up vars
var editor; 
var oTable;
var cancelled=false;
var cancelledSessions=false;
var lib;
var databases;

var db;
  // https://developer.mozilla.org/en/IndexedDB/Using_IndexedDB
  var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
  var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;

/* -------------------------------------------------------------------------------- 
Function : updateScreen
Params : none
Simple function to update the data loaded after inserts, database changes and so on
ToDo : 
1) 
*/ 
function updateScreen() {
  // create tabs for sessions
  initTabs();

  // create table with all riders in Riders tab
  initRiderTable();

  // results table
  initResults();

  // seeding table
  initSeeding();

  // categories
  initCategoriesTable();

  // settings
  initSettingsTable();

  // databases table in data tab
  initDatabasesTable();

  // sessions table in data tab
  initSessionsMaintTable();

  // heats table in data tab
  initHeatsMaintTable();

  // update databases object
  allStorage();

  // update dropdown
  updateDropDown();

  // update starter options
  updateStarter();

}

function updateDropDown() {

  // check if a year is stored in localstorage, else load current year
  if (localStorage.getItem("lastDatabase") !== null) {
    var currentDatabase = localStorage.getItem('lastDatabase');
  } else {
    var currentDatabase = new Date().getFullYear();
    if (databases.indexOf(currentDatabase) === -1) {
      databases.push(currentDatabase);
    }
  }

  select = document.getElementById('selectedYear');
  
  if (select.length >= databases.length) {
    select.options.length = 0;
  }

  for (database of databases) {
    var opt = document.createElement('option');
    opt.value = database;
    opt.innerHTML = database;
    select.appendChild(opt);
  }

  select.value = currentDatabase;
}

/* -------------------------------------------------------------------------------- 
Function : add2db
Params : table, record
This function adds a record to indexddb in the table
Takes the params:
1) table -> table to insert to
2) record -> json object to insert
*/ 
function add2db(table,record) {
  //console.log(db);
  
  console.log(record);
  //record = JSON.parse(record);
  console.log(record);
  
  // open table for writing
  var transaction = db.transaction(table, "readwrite");  
  
  transaction.oncomplete = function(event) {
    console.log("All done!");
  };

  transaction.onerror = function(event) {
    // Don't forget to handle errors!
    console.dir(event);
  };

  var objectStore = transaction.objectStore(table);
  //use put versus add to always write, even if exists
  var request = objectStore.add(record);

  request.onsuccess = function(event) {
    console.log("done with insert");
  };

}

/* --------------------------------------------------------------------------------
Functon : addDays
helper function to add days to start date
*/
function addDays(date, days) {
  date = new Date(date);
  date.setDate(date.getDate() + days);
  date = date.toISOString().split('T')[0];
  return date;
}


/* -------------------------------------------------------------------------------- 
Function : connect2db
Params : year
This function connects to the localstorage db_[year] object. If the object exists
it will read the tables and call all functions to build all tables. If the year does
not exist it will create the object, create tables and enter some defaults into them
so the database functions at minimal level. 
Takes the params:
1) year -> the year of the event
ToDo : 
1) 
*/ 
async function connect2db(database) {
  
  // localstorage
  lib = new localStorageDB(database, localStorage);

  if(lib.isNew() ) {
    $('#myDialog').show();
    $('#myDialog').dialog({
      open: function(event, ui) {
        $(this).parent().children().children('.ui-dialog-titlebar-close').hide();
        $('#myDate').datepicker({
          title:'Start date', 
          dateFormat: 'yy-mm-dd',
          firstDay: 1
        }).blur();
      },
      onClose: function() {
        console.debug(selectedDate);
        //$('#myDate').datepicker('destroy');
      },
      buttons: {
        Ok: function () {
          $(this).dialog("close"); //closing on Ok
        },
      },
    });

    $('#myDialog').on('dialogclose', function(event) {
      // get start date
      
      var startDate = $('#myDate').val();
      
      // create tables
      lib.createTable("riders", ["name", "bike", "team", "category", "pb", "hat","note"]);
      lib.createTable("categories", ["name", "cat", "mph", "type"]);
      lib.createTable("sessions", ["name", "day", "time", "daynr"]);
      lib.createTable("heats", ["name", "course", "session_link", "time"]);
      lib.createTable("runs", ["rider_link", "heat_link", "launch_time", "observations", "time_in_trap", "wind_ms", "note", "completed", "key"]);
      lib.createTable("settings", ["name", "value", "display", "note"]);

      // default settings
      lib.insert("settings", {name: "time_to_mph", value: "447.38837", display: "Time 2 Miles Per Hour", note: "convert seconds to mph"});
      lib.insert("settings", {name: "mile_to_k", value: "1.609344", display: "Miles to Kilometers", note: "convert seconds to kph"});
      lib.insert("settings", {name: "legalwind_fpm", value: 328, display: "Legal wind FPM", note: "legal wind in feet per minute"});
      lib.insert("settings", {name: "legalwind_ms", value: "1.6666", display: "Legal Wind M/S", note: "legal wind in meter per second"});
      lib.insert("settings", {name: "ms_to_fpm", value: "204.13", display: "MS 2 FPM", note: "take into account 5% variation new reader"});
      lib.insert("settings", {name: "cutoff_5_am", value: "45", display: "Cutoff 5 mile AM", note: "minimal speed 5 mile runs in morning"});
      lib.insert("settings", {name: "cutoff_5_pm", value: "65", display: "Cutoff 5 mile PM", note: "minimal speed 5 mile runs in evening"});
      
      // insert default data categories
      lib.insert("categories", {name: "Mens", cat: "M", mph: 89.59, type: "inital"});
      lib.insert("categories", {name: "Womens", cat: "W", mph: 75.69, type: "inital"});
      lib.insert("categories", {name: "Mens Trike", cat: "MT", mph: 73.95, type: "inital"});
      lib.insert("categories", {name: "Womens Trike", cat: "WT", mph: 54.45, type: "inital"});
      lib.insert("categories", {name: "Mens Multirider", cat: "MR", mph: 74.73, type: "inital"});
      lib.insert("categories", {name: "Womens Multirider", cat: "WR", mph: 0.00, type: "inital"});
      lib.insert("categories", {name: "Mens Arm", cat: "MA", mph: 51.58, type: "inital"});
      lib.insert("categories", {name: "Womens Arm", cat: "WA", mph: 46.05, type: "inital"});

      // create default sessions
      lib.insert("sessions", {name: "Sunday (AM)", day: "Sunday", time: "AM", daynr: startDate});
      lib.insert("sessions", {name: "Sunday (PM)", day: "Sunday", time: "PM", daynr: startDate});
      lib.insert("sessions", {name: "Monday (AM)", day: "Monday", time: "AM", daynr: addDays(startDate, 1)});
      lib.insert("sessions", {name: "Monday (PM)", day: "Monday", time: "PM", daynr: addDays(startDate, 1)});
      lib.insert("sessions", {name: "Tuesday (AM)", day: "Tuesday", time: "AM", daynr: addDays(startDate, 2)});
      lib.insert("sessions", {name: "Tuesday (PM)", day: "Tuesday", time: "PM", daynr: addDays(startDate, 2)});
      lib.insert("sessions", {name: "Wednesday (AM)", day: "Wednesday", time: "AM", daynr: addDays(startDate, 3)});
      lib.insert("sessions", {name: "Wednesday (PM)", day: "Wednesday", time: "PM", daynr: addDays(startDate, 3)});
      lib.insert("sessions", {name: "Thursday (AM)", day: "Thursday", time: "AM", daynr: addDays(startDate, 4)});
      lib.insert("sessions", {name: "Thursday (PM)", day: "Thursday", time: "PM", daynr: addDays(startDate, 4)});
      lib.insert("sessions", {name: "Friday (AM)", day: "Friday", time: "AM", daynr: addDays(startDate, 5)});
      lib.insert("sessions", {name: "Friday (PM)", day: "Friday", time: "PM", daynr: addDays(startDate, 5)});
      lib.insert("sessions", {name: "Saturday (AM)", day: "Saturday", time: "AM", daynr: addDays(startDate, 6)});
      lib.insert("sessions", {name: "Saturday (PM)", day: "Saturday", time: "PM", daynr: addDays(startDate, 6)});

      // create default heats
      lib.insert("heats", {name: "2.5 1st qualify", course: "2.5 qualify", session_link: 1, time: "07:15"});
      lib.insert("heats", {name: "2.5 2nd qualify", course: "2.5 qualify", session_link: 1, time: "07:45"});
      lib.insert("heats", {name: "2.5 3rd qualify", course: "2.5 qualify", session_link: 1, time: "08:15"});
      lib.insert("heats", {name: "2.5 4th qualify", course: "2.5 qualify", session_link: 1, time: "08:45"});
      lib.insert("heats", {name: "2.5 5th qualify", course: "2.5 qualify", session_link: 1, time: "09:15"});
      lib.insert("heats", {name: "5 mile heat 1", course: "5 mile", session_link: 2, time: "17:15"});
      lib.insert("heats", {name: "5 mile heat 2", course: "5 mile", session_link: 2, time: "17:45"});
      lib.insert("heats", {name: "5 mile heat 3", course: "5 mile", session_link: 2, time: "18:15"});
      lib.insert("heats", {name: "2.5 1st qualify", course: "2.5 qualify", session_link: 3, time: "07:15"});
      lib.insert("heats", {name: "2.5 2nd qualify", course: "2.5 qualify", session_link: 3, time: "07:45"});
      lib.insert("heats", {name: "5 mile heat 1", course: "5 mile", session_link: 3, time: "08:30"});
      lib.insert("heats", {name: "5 mile heat 2", course: "5 mile", session_link: 3, time: "09:00"});
      lib.insert("heats", {name: "5 mile heat 3", course: "5 mile", session_link: 3, time: "09:30"});
      lib.insert("heats", {name: "5 mile heat 1", course: "5 mile", session_link: 4, time: "17:15"});
      lib.insert("heats", {name: "5 mile heat 2", course: "5 mile", session_link: 4, time: "17:45"});
      lib.insert("heats", {name: "5 mile heat 3", course: "5 mile", session_link: 4, time: "18:15"});
      

      // some default riders
      lib.insert("riders", {name: "Andrea Gallo", bike: "Roadrunner", team: "Aeron", category: "Mens", pb: "84.92", hat: "80", note: ""});
      lib.insert("riders", {name: "Adam Hari", bike: "Falcon", team: "HPT Falcon", category: "Mens", pb: "72.07", hat: "70", note: ""});

      // commit changes to localstorage
      lib.commit();

      // update page title
      document.title = 'WHPSC - Timing App - ' + database;

      // update the screen
      updateScreen();
    });		
  
    // update the screen
    //updateScreen();	
  } else {
    // update the screen
    updateScreen();	
  }
  
}

/* -------------------------------------------------------------------------------- 
Function : initSettingsTable
Params : none
This function builds the settings table in the Settings tab. These settings are used
for caculations and transformations of data. 
ToDo : 
1) determine if edit and delete are needed
*/ 
function initSettingsTable() {
  // check if table already exists and then destroy for reloads after edits
  if ( $.fn.DataTable.isDataTable('#settingsTable') ) {
    $('#settingsTable').DataTable().destroy();
  }	

  // set up vars
  var index=0;
  var jsonSet = {};

  // query the categories table
  lib.queryAll("settings", {
    // the callback function is applied to every row in the table
    query: function(row) {    
      // format note
      var note= row.note;
           note=note.replace(/\n/g, "<br>");

      // create JSON
      jsonSet[index] = [{id: row.ID , name: row.name, value: row.value, display: row.display, note: note}];
      index++;
    }
  });

  // set up the editor
    editor = new $.fn.dataTable.Editor( {
    table: "#settingsTable",
    idSrc: 'id',
    fields: [
      {
        label: "Display:",
        name: "display"
      }, {
        label: "Value:",
        name: "value"
      }, {
        label: "Note:",
        name: "note"
      }
    ],
    ajax: function ( method, url, d, successCallback, errorCallback ) {
      var output = { data: [] };

      if ( d.action === 'create' ) {
        // insert new rider into table on localstorage
        lib.insert("settings", {name: d.data[0].name, value: d.data[0].value, display: d.data[0].display, note: d.data[0].note});
        lib.commit();
      }

      else if ( d.action === 'edit' ) {
        // update each edited item with the data submitted
        $.each( d.data, function (id, value) {
          lib.insertOrUpdate("settings", {ID: id}, {value: value.value, display: value.display, note: value.note});
          lib.commit();
        } );
      }

      else if ( d.action === 'remove' ) {
        // remove items from localstorage
        $.each( d.data, function (id) {
          lib.deleteRows("settings", {ID: id});
          lib.commit();
        } );	
      }

      // show Editor what has changed
      successCallback(output);

      // call ourself to update the changes visually as well
      initSettingsTable();
    }
  } );

  oTable=$('#settingsTable').dataTable({
    dom: "Bfrtip",
    data: $.map( jsonSet, function (value, key) {
      return value;
    } ),
    columns: [
      { data: "id", title: "ID" },
      { data: "display", title: "Display"},
      { data: "value", title: "Value"},
      { data: "name", title: "Category" },
      { data: "note", title: "Note"}
    ],
    columnDefs: [
      { targets: 0, visible:false }
    ],
    paging: false,
    responsive: true,
    select: true,
    buttons: [
      //{ extend: "create", editor: editor, className: "submit btn btn-primary" },
      { extend: "edit",   editor: editor, className: "submit btn btn-primary" },
      /*
      { extend: "remove", editor: editor, className: "submit btn btn-primary",
        formMessage: function ( e, dt ) {
          var rows = dt.rows( e.modifier() ).data().pluck('name');
          return 'Are you sure you want to delete the '+
            'following settings(s)?<br>&#x2022; '+rows.join('<br>&#x2022; ')+'';
        },
      }
      */
    ],
  });
}

/* -------------------------------------------------------------------------------- 
Function : initCategories
Params : none
This function builds the categories table in the Settings tab. Allows add, delete,
modify on categories. These are used on the rider entry form in a dropdown and 
ultimately to calculate world records and determine seeding. 
ToDo : 
1) 
*/ 
function initCategoriesTable() {
  // check if table already exists and then destroy for reloads after edits
  if ( $.fn.DataTable.isDataTable('#categoriesTable') ) {
    $('#categoriesTable').DataTable().destroy();
  }	

  // set up vars
  var index=0;
  var jsonSet = {};

  // query the categories table
  lib.queryAll("categories", {
    // the callback function is applied to every row in the table
    query: function(row) {    
      // create JSON
      jsonSet[index] = [{id: row.ID , name: row.name, cat: row.cat, mph: row.mph, type: row.type}];
      index++;
    }
  });

  // set up the editor
  editor = new $.fn.dataTable.Editor( {
    table: "#categoriesTable",
    idSrc: 'id',
    fields: [
      {
        label: "Name:",
        name: "name"
      }, {
        label: "Short:",
        name: "cat"
      }, {
        label: "Current record:",
        name: "mph"
      }
    ],
    ajax: function ( method, url, d, successCallback, errorCallback ) {
      var output = { data: [] };

      if ( d.action === 'create' ) {
        // insert new category into table on localstorage
        lib.insert("categories", {name: d.data[0].name, cat: d.data[0].cat, mph: d.data[0].mph, type: "user"});
        lib.commit();
      }

      else if ( d.action === 'edit' ) {
        // update each edited item with the data submitted
        $.each( d.data, function (id, value) {
          lib.insertOrUpdate("categories", {ID: id}, {name: value.name, cat: value.cat, mph: value.mph, type: "user"});
          lib.commit();
        } );
      }

      else if ( d.action === 'remove' ) {
        // remove items from localstorage
        $.each( d.data, function (id) {
          lib.deleteRows("categories", {ID: id});
          lib.commit();
        } );	
      }

      // show Editor what has changed
      successCallback(output);

      // call ourself to update the changes visually as well
      initCategoriesTable();

      // update screen
      updateScreen();
    }
  } );

  oTable=$('#categoriesTable').dataTable({
    dom: "Bfrtip",
    data: $.map( jsonSet, function (value, key) {
      return value;
    } ),
    columns: [
      { data: "id", title: "ID" },
      { data: "name", title: "Category" },
      { data: "cat", title: "Short name"},
      { data: "mph", title: "Record (mph)"},
      { data: "type", title: "Source"}
    ],
    columnDefs: [
      { targets: 0, visible:false }
    ],
    paging: false,
    responsive: true,
    select: true,
    buttons: [
      { extend: "create", editor: editor, className: "submit btn btn-primary" },
      { extend: "edit",   editor: editor, className: "submit btn btn-primary" },
      { extend: "remove", editor: editor, className: "submit btn btn-primary",
        formMessage: function ( e, dt ) {
          var rows = dt.rows( e.modifier() ).data().pluck('name');
          return 'Are you sure you want to delete the '+
            'following categories(s)?<br>&#x2022; '+rows.join('<br>&#x2022; ')+'';
        },
      }
    ],
  });
}

/* -------------------------------------------------------------------------------- 
Function : initRiderTable
Params : none
This function builds the rider table in the Rider tab. It gets all the riders from
the storage and allows add, delete, modify on the riders object. 
ToDo : 
1) 
*/ 
function initRiderTable() {
  // check if table already exists and then destroy for reloads after edits
  if ( $.fn.DataTable.isDataTable('#riderTable') ) {
    $('#riderTable').DataTable().destroy();
  }
  
  // set up vars
  var index=0;
  var jsonSet = {};

  // query the rider table
  lib.queryAll("riders", {
    // the callback function is applied to every row in the table
    query: function(row) {    
      // format note
      var note= row.note;
           note=note.replace(/\n/g, "<br>");
        
      // create JSON
      jsonSet[index] = [{id: row.ID , name: row.name, bike: row.bike, team: row.team, category: row.category, pb: row.pb, hat: row.hat, note: note}];
      index++;
    }
  });

  // fill dropdowns
  var options = {};
  var categories = []

  lib.queryAll("categories", {
    // the callback function is applied to every row in the table
    query: function(row) {    
      categories.push({id: row.ID, category: row.name, short: row.cat});
    }
  });

  // add to options value
  options.categories = categories;

  // set up the editor
  editor = new $.fn.dataTable.Editor( {
    table: "#riderTable",
    idSrc: 'id',
    fields: [
      {
        label: "Rider:",
        name: "name"
      }, {
        label: "Bike:",
        name: "bike"
      }, {
        label: "Category:",
        name: "category",
        type: 'select',
        options: $.map( options.categories, function ( val, key ) {
          return val.category;
        } )
      }, {
        label: "Team:",
        name: "team"
      }, {
        label: "Personal Best:",
        name: "pb"
      },{
        label: "Current hat:",
        name: "hat",
        type: "select",
        options: ['',50,55,60,65,70,75,80,85,90,95,100],
      }, {
        label: "Note:",
        name: "note"
      }
    ],
    ajax: function ( method, url, d, successCallback, errorCallback ) {
      var output = { data: [] };

      if ( d.action === 'create' ) {
        // insert new rider into table on localstorage
        lib.insert("riders", {name: d.data[0].name, bike: d.data[0].bike, team: d.data[0].team, category: d.data[0].category, pb: d.data[0].pb, hat: d.data[0].hat, note: d.data[0].note});
        lib.commit();
      }

      else if ( d.action === 'edit' ) {
        // update each edited item with the data submitted
        $.each( d.data, function (id, value) {
          lib.insertOrUpdate("riders", {ID: id}, {name: value.name, bike: value.bike, team: value.team, category: value.category, pb: value.pb, hat: value.hat, note: value.note });
          lib.commit();
        } );
      }

      else if ( d.action === 'remove' ) {
        // remove items from localstorage
        $.each( d.data, function (id) {
          lib.deleteRows("riders", {ID: id});
          lib.commit();
        } );	
      }

      // show Editor what has changed
      successCallback(output);

      // call function to re-render table with new rider
      initRiderTable();

      // also update results
      initResults();

      // and seeding
      initSeeding();
    }
  } );


  // validate 
  editor.on( 'preSubmit', function ( e, o, action ) {
    if ( action !== 'remove' ) {
      
      // check personal best for a dot and two digits behind
      var pb = this.field( 'pb' );
      var pbReg = /^[\d]*[\.]\d{2,3}$/;
      
      if (pbReg.test(pb.val()) == false) {
        pb.error( 'Please enter a speed in [x]x.xx format' );
      }

      // If any error was reported, cancel the submission so it can be corrected
      if ( this.inError() ) {
        return false;
      }

    }
  });

  // assign data to columns in datatables
  oTable=$('#riderTable').dataTable({
    dom: "Bfrtip",
    data: $.map( jsonSet, function (value, key) {
      return value;
    } ),
    columns: [
      { data: "id", title: "ID" },
      { data: "name", title: "Rider" },
      { data: "bike", title: "Bike"},
      { data: "team", title: "Team"},
      { data: "category", title: "Category"},
      { data: "pb", title: "Personal Best"},
      { data: "hat", title: "Hat"},
      { data: "note", title: "Note"}
    ],
    columnDefs: [
      { targets: 0, visible:false }
    ],
    paging: false,
    select: true,
    buttons: [
      { extend: "create", editor: editor, className: "submit btn btn-primary" },
      { extend: "edit",   editor: editor, className: "submit btn btn-primary" },
      { extend: "remove", editor: editor, className: "submit btn btn-primary",
        formMessage: function ( e, dt ) {
          var rows = dt.rows( e.modifier() ).data().pluck('name');
          return 'Are you sure you want to delete the '+
            'following riders(s)?<br>&#x2022; '+rows.join('<br>&#x2022; ')+'';
        },
        formButtons: [
          'Delete',
          { text: 'Cancel', action: function () { this.close(); } }
        ]
      }
    ],
  });
}

/* -------------------------------------------------------------------------------- 
Function : initTabs
Params : none
This function builds all the tabs for all sessions.
ToDo : 
1) add session
2) delete session
3) modify session
*/ 
function initTabs() {
  
  // remove all existing sessions from dropdown
  $("#sessionsTab").each(function() {
    $(this).find("li").each(function(index, element) {
      $(this).remove();
    });
  });

  lib.queryAll("sessions", {
    query: function(row) { 
      // create value for tab href
      href_value = row.day + row.time;

      // create
      $("#sessionsTab").append('<li><a data-target="#' + href_value +'" role="tab" data-toggle="tab">' + row.name + '</a></li>');
      
      // create div
      $(".tab-content").append('<div id="' + href_value + '" class="tab-pane fade" style="border:1px solid transparent;border-radius:4px;border-color:#ddd; padding:10px;"></div>');
      
      // create session table
      initSessionTable(href_value, row.name, row.ID);
    }
  });

  // update hash function
  $(function() {
    // Javascript to enable link to tab
    var hash = document.location.hash;
    if (hash) {
    $('.nav-tabs a[href=\\'+hash+']').tab('show');
    }
 
    // Change hash for page-reload
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
    window.location.hash = e.target.hash;
    });

  });
}

/* -------------------------------------------------------------------------------- 
Function : initSessionTable
Params : sessionName, sessionID
This function adds a heat to a session and calls the initRuns for each. Takes the params:
1) sessionName -> 
2) sessionID -> 
ToDo : 
1) 
*/ 
function initSessionTable(sessionHref, sessionName, sessionID) {	
  // clean existing data
  $("#" + sessionHref).html('');

  // add session name before tables
  $("#" + sessionHref).append('<center><h3 id="title_session_'+sessionHref+'">'+sessionName+'</h3></center><br>');

  // add runs
  initRuns(sessionHref, sessionID);
}

/* -------------------------------------------------------------------------------- 
Function : initRuns
Params : sessionName, sessionID
This function builds all the heat tables for all sessions during the week. If there
are heats in a session these will be displayed. Within the tables it will also allow 
edit of the heat by adding riders, deleting riders, modyfying riders and changing the
order (drag on first column). Most important is edit when the event is taking place
which allows entering time in trap and windspeed. Takes the following params:
1) sessionName -> 
2) sessionID -> 
ToDo :
1) getting rider details ID for edit
2) destroying title and table on reload after edit or delete or add
3) adding a rider in the dropdown with bike and category (perhaps rider in multiple bikes)
4) option to enter windspeed in fpm/ms
5) options for scratch, dnf, dns 
*/ 
function initRuns(sessionName, sessionID) {
  // get settings for calculatiobs
  var settings=[];

  lib.queryAll("settings", {
    query: function(row) {
      settings[row.name] = row.value;
    }
  });

  var legalwind = settings.legalwind_fpm;

  var heats = lib.queryAll("heats", {
    query: {"session_link": sessionID},
    sort: [["time", "ASC"]]
  });

  for (heat of heats) {
    // reset params
    var dataSet=[];
    var index=0;
    var jsonSet = {};

    // there is a heat for this section
    var heatID = heat.ID;

    //console.log(heat.ID + " " + heat.name);
    
    // add title if not existent, first clean entry
    var rowId = heat.name;
    rowId = rowId.replace(/ /g,"_");
    rowId = rowId.replace(/\./g,"_");

    if( $('#title_session_'+ heat.ID).length == 0) {
      $("#" + sessionName).append('<br><h4 class="dataTablesTitle" style="margin-top:-25px;" id="title_session_'+ heat.ID +'">' + heat.name + ' (' + heat.time + ')</h4>');
    }
    
    // add table elemeent
    $("#" + sessionName).append('<table id="' + sessionName + '_' + heatID + '" class="display" style="border-collapse: collapse;width: 100%;"></table><br><br><br>');

    // now query runs
    lib.queryAll("runs", {
      query: function(row) { 
        if (row.heat_link == heatID) {
          var riderLink = row.rider_link;

          // 
          var riders = lib.queryAll("riders", {
            query: {ID: riderLink}
          });
          
          // results from dataset
          var launch_time = row.launch_time;
          var riderName =riders[0].name;
          var bikeName = riders[0].bike;
          var category = riders[0].category;
          var trap_time = row.time_in_trap;
          var wind_ms = row.wind_ms;
          var note = row.note;
          var observations = row.observations;

          // get current wr for category
          var current_wr = lib.queryAll("categories", {
            query: {name: category}
          });

          // time to speed
          if (row.completed == true) {
            //var speed_miles = (settings.time_to_mph / row.time_in_trap).toFixed(2);
            var speed_miles = speedMiles(row.time_in_trap);
            var speed_km = (speed_miles * settings.mile_to_k).toFixed(2);
            // convert trap time to 3 digits always
            trap_time = (1 * trap_time).toFixed(3);
          } else {
            var trap_time = "";
            var speed_miles = "";
            var speed_km = "";
          }
          
          // wind speed from ms to fpm
          if (wind_ms > "") {
            var wind_fpm = (wind_ms * settings.ms_to_fpm).toFixed(2);
            // check legal wind
            if (wind_fpm <= legalwind) {
              var legal_wind = "<center><p style='color:#008000;font-weight:bold;margin:0px;'><span class='glyphicon glyphicon-ok'></span></p></center>";
            } else {
              var legal_wind = "<center><p style='color:red;margin:0px;'><span class='glyphicon glyphicon-remove'></span></p></center>";
            }
          } else {
            var wind_fpm = "";
            var legal_wind = "";
          }
          
          // check wr
          if ((parseInt(current_wr[0].mph) <= speed_miles) && (wind_fpm <= legalwind) && (speed_miles > "")) {
            var new_wr = "<center><p style='color:#008000;font-weight:bold;margin:0px;'><span class='glyphicon glyphicon-ok'></span></p></center>";
            
            // update wr with new value
            lib.insertOrUpdate("categories", {name: category}, {	
              name: category,
              mph: speed_miles,
              type: "system updated"
            });

            lib.commit();

            initCategoriesTable();

            // update screen
            //updateScreen();

          } else {
            if (speed_miles > 0) {
              var new_wr = "<center><p style='color:red;margin:0px;'><span class='glyphicon glyphicon-remove'></span></p></center>";
            } else {
              var new_wr = "";
            }
          }

          // do not show running as observation, only show special cases
          if (observations == "Running") {
            observations = "";
          }

          // update hat, not doing that now
          /*
          var new_hat_speed = Math.floor(speed_miles / 5) * 5;
          if ((new_hat_speed > riders[0].hat) && (new_hat_speed >= 50)) {
            // update hat
            lib.insertOrUpdate("riders", {name: riderName}, {	
              hat: new_hat_speed});

            lib.commit();
          
          }
          */
          if (row.key == "") {
            var key = index + 1;
          } else {
            var key = row.key;
          }

          jsonSet[index] = [{key: key, id: row.ID , launch_time: launch_time, observations: observations, riderName: riderName, bikeName: bikeName, category: category, trap_time: trap_time, speed_miles: speed_miles, speed_km: speed_km, wind_fpm: wind_fpm, wind_ms: wind_ms, legal_wind: legal_wind, new_wr: new_wr, note: note}];
          index++;
        }
      }
    });


    
    // fill rider dropdown
    var options = {};
    var riders = []

    /*
    lib.queryAll("riders", {
      // the callback function is applied to every row in the table
      query: function(row) {    
        // works : riders.push({id: row.ID, name: row.name});
        riders.push({value: row.ID, label: row.name + ' - ' + row.bike});
      }
    });
    */
    
    var ridersData = lib.queryAll("riders", {
      sort: [["name", "ASC"]]
    });

    for (riderData of ridersData) {
      riders.push({value: riderData.ID, label: riderData.name + ' - ' + riderData.bike});
    }

    // add to options value
    options.riders = riders;
    //console.log(riders);
    

    // set up the editor
    editor_new = new $.fn.dataTable.Editor( {
      table: "#" + sessionName + "_" + heatID,
      idSrc: 'id',
      fields: [
        {
          label: "Rider:",
          name: "riderName",
          type: 'select',
          options: riders
        }, {
          label: "Status",
          name: "observations",
          type: "select",
          def: "Running",
          options: [ 
            {label: 'Running', value: 'Running'},
            {label: 'On Deck', value: 'On Deck'},
            {label: 'Did Not Start', value: 'Did Not Start'}, 
            {label: 'Did Not Finish', value: 'Did Not Finish'}, 
            {label: 'Scratch', value: 'Scratch'}
          ]
        }, {
          label: "Note:",
          name: "note"
        }, {
          label: "Heat:",
          name: "heatID",
          def: heatID,
          type: 'hidden'
        }, {
          label: "Session:",
          name: "sessionName",
          def: sessionName,
          type: 'hidden'
        }
      ],
      ajax: function ( method, url, d, successCallback, errorCallback ) {
        
        var rowContent = $("#" + d.data[0].sessionName + "_" +d.data[0].heatID + " tr td.dataTables_empty");
        if (rowContent.length == 1) {
          // table was empty
          var rowCount = 1;
        } else {
          var rowCount = $("#" + d.data[0].sessionName + "_" +d.data[0].heatID + " tr").length;
        }
        
        var output = { data: [] };

        if ( d.action === 'create' ) {
          // get data
          var riderLink = d.data[0].riderName;
          var heatLink = d.data[0].heatID;
          var noteText = d.data[0].note;
          var observationsText = d.data[0].observations;

          // insert into database
          lib.insert("runs", {key: rowCount, rider_link: riderLink, heat_link: heatLink, note: noteText, observations: observationsText, completed: false});
          lib.commit();
        }

        // show Editor what has changed
        successCallback(output);

        // call function to re-render table with new results
        initRuns(sessionName, sessionID);
      }
    } );

    // set up the editor
    editor_edit = new $.fn.dataTable.Editor( {
      table: "#" + sessionName + "_" + heatID,
      idSrc: 'id',
      fields: [
        {
          label: "Status",
          name: "observations",
          type: "select",
          options: [ 
            {label: 'Running', value: 'Running'},
            {label: 'On Deck', value: 'On Deck'},
            {label: 'Did Not Start', value: 'Did Not Start'}, 
            {label: 'Did Not Finish', value: 'Did Not Finish'}, 
            {label: 'Scratch', value: 'Scratch'},
            {label: 'No Time Recorded', value: 'No Time Recorded'}
          ]
        },
        {
          label: "200 meter time",
          name: "trap_time"
        }, {
          label: "Wind m/s:",
          name: "wind_ms"
        }, {
          label: "Launch time:",
          name: "launch_time"
        }, {
          label: "Note:",
          name: "note"
        },
      ],
      ajax: function ( method, url, d, successCallback, errorCallback ) {
      
        var output = { data: [] };

        if ( d.action === 'edit' ) {
          console.log(d);
          // update each edited item with the data submitted
          $.each( d.data, function (id, value) {
            // check values, used for only updating status
            if (value.trap_time == '') {
              var checkCompleted = false;
            } else {
              var trap_time = value.trap_time;
              var checkCompleted = true;
            }
            
            // insert data and commit
            lib.insertOrUpdate("runs",  {ID: id}, {launch_time: value.launch_time, time_in_trap: trap_time, wind_ms: value.wind_ms , note: value.note, observations: value.observations, completed: checkCompleted});
            lib.commit();
          } );
        }

        else if ( d.action === 'remove' ) {
          // remove items from localstorage
          $.each( d.data, function (id) {
            lib.deleteRows("runs", {ID: id});
            lib.commit();
          } );	
        }

        // show Editor what has changed
        successCallback(output);

        // call function to re-render table with new results
        initRuns(sessionName, sessionID);

        // update seeding
        initSeeding();

        // update results
        initResults();
      }
    } );

    // validate 
    editor_edit.on( 'preSubmit', function ( e, o, action ) {
          if ( action !== 'remove' ) {
      
        if (this.field( 'observations').val() == "Running") {

          // check launch time has format HH:MM or H:MM
          var launchtime = this.field( 'launch_time' );
          var timeReg = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
          
          if (timeReg.test(launchtime.val()) == false) {
            launchtime.error( 'Please enter a time in HH:MM format' );
          }

          // check trap time for a dot and three digits behind
          var traptime = this.field( 'trap_time' );
          var trapReg = /^[\d]*[\.]\d{3}$/;
          
          if (trapReg.test(traptime.val()) == false) {
            traptime.error( 'Please enter a time in SS.sss' );
          }

          // check wind speed for a dot and two digits behind
          var wind = this.field( 'wind_ms' );
          var windReg = /^[\d]*[\.]\d{2}$/;
          
          if (windReg.test(wind.val()) == false) {
            wind.error( 'Please enter a speed in [x]x.xx format' );
          }

          // If any error was reported, cancel the submission so it can be corrected
          if ( this.inError() ) {
            return false;
          }
        }

      }
    });

    // check if table already exists and then destroy for reloads after edits
    if ( $.fn.DataTable.isDataTable('#' + sessionName + '_' + heatID)) {
      $('#' + sessionName + '_' + heatID).DataTable().destroy();
    }

    oTable=$('#' + sessionName + '_' + heatID).DataTable({
      dom: "Bfrtip",
      data: $.map( jsonSet, function (value, key) {
        return value;
      } ),
      columns: [
        { data: "id", title: "ID" },
        { data: "key", title: "Order" },
        { data: "observations", title: "Status"},
        { data: "riderName", title: "Rider", width:"150px"},
        { data: "bikeName", title: "Bike",width:"150px"},
        { data: "category", title: "Category"},
        { data: "launch_time", title: "Launch time" },
        { data: "trap_time", title: "200m time"},
        { data: "speed_miles", title: "Speed mph"},
        { data: "speed_km", title: "Speed kph"},
        { data: "wind_fpm", title: "Wind fpm"},
        { data: "wind_ms", title: "Wind m/s"},
        { data: "legal_wind", title: "Wind Legal"},
        { data: "new_wr", title: "New WR"},
        { data: "note", title: "Note", width:"300px"},
      ],
      rowReorder: {
        dataSrc: "key",
      },
      searching: false, 
      responsive: true,
      paging: false, 
      info: false,
      autoWidth: false,
      columnDefs: [
        { targets: 0, visible: false, orderable: false},
        { targets: 1, visible: true, className: 'reorder', orderable: false },
        { targets: 2, visible: true, orderable: false},
        { targets: 3, visible: true, orderable: false},
        { targets: 4, visible: true, orderable: false },
        { targets: 5, visible: true, orderable: false },
        { targets: 6, visible: true, orderable: false },
        { targets: 7, visible: true, orderable: false },
        { targets: 8, visible: true, orderable: false },
        { targets: 9, visible: true, orderable: false },
        { targets: 10, visible: true, orderable: false },
        { targets: 11, visible: true, orderable: false },
        { targets: 12, visible: true, orderable: false },
        { targets: 13, visible: true, orderable: false },
        { targets: 14, visible: true, orderable: false },
      ],
      order: [[1, 'asc']],
      select: true,
      buttons: [
        { extend: "create", editor: editor_new, className: "submit btn btn-primary btn-sessions" },
        { extend: "edit",   editor: editor_edit, className: "submit btn btn-primary btn-sessions" },
        { extend: "remove", editor: editor_edit, className: "submit btn btn-primary btn-sessions",
          formMessage: function ( e, dt ) {
            var rows = dt.rows( e.modifier() ).data().pluck('riderName');
            return 'Are you sure you want to delete the '+
              'following run(s)?<br>&#x2022; '+rows.join('<br>&#x2022; ')+'';
          },
          formButtons: [
            'Delete',
            { text: 'Cancel', action: function () { this.close(); } }
          ]
        }
      ],
    });

    // allow reorder
    $('#' + sessionName + '_' + heatID).DataTable().on( 'row-reorder', function ( e, diff, edit ) {
      for ( var i=0, ien=diff.length ; i<ien ; i++ ) {
        var rowData = $('#' + e.target.id).DataTable().row( diff[i].node ).data();
            
        result = rowData.riderName+' updated to be in position '+diff[i].newData+' (was '+diff[i].oldData+')';
        console.log(result);
        lib.insertOrUpdate("runs",  {ID: rowData.id}, {key: diff[i].newData});
        lib.commit();
      }

      
    });

  }
}

/* -------------------------------------------------------------------------------- 
Function : speedMiles
Params : time
Transforms time to speed in miles. Params:
1) time : time in seconds
*/
function speedMiles(time) {
  // get settings for calculatiobs
  var settings=[];

  lib.queryAll("settings", {
    query: function(row) {
      settings[row.name] = row.value;
    }
  });

  // calculation
  var speed = (settings.time_to_mph / time).toFixed(2);

  return speed;
}

/* -------------------------------------------------------------------------------- 
Function : initResults
Params : none
This function builds the results table in the Results tab. It shows all runs by 
all riders during the event. The runs are sorted by the sessions. For a typical
WHPSC event during the writing of this app that means start on Sunday AM and ending
on SAT PM.
ToDo : 
1) update pb during the week 
2) take start legality in comparison for world record
*/ 
function initResults() {
  // check if table already exists and then destroy for reloads after edits
  if ( $.fn.DataTable.isDataTable('#resultsTable') ) {
    $('#resultsTable').DataTable().destroy();
  }
  
  var dataSet=[];
  var index=0;

  // get settings for calculatiobs
  var settings=[];

  lib.queryAll("settings", {
    query: function(row) {
      settings[row.name] = row.value;
    }
  });

  lib.queryAll("runs", {
    query: function(row) { 
      var riderLink = row.rider_link;
      // get rider details
      var riders = lib.queryAll("riders", {
        query: {ID: riderLink}
      });

      var heatLink = row.heat_link;
      // get heat info
      var heats = lib.queryAll("heats", {
        query: {ID: heatLink}
      });

      var sessionLink = heats[0].session_link;
      // get session info
      var sessions = lib.queryAll("sessions", {
        query: {ID: sessionLink}
      });

      var categoryLink = riders[0].category;
      var categories = lib.queryAll("categories", {
        query: {name: categoryLink}
      });

      // time to speed
      var speed_miles = speedMiles(row.time_in_trap);

      // other calcs
      if (speed_miles >= parseInt(riders[0].pb)) {
        var new_pb = "<center><p style='color:#008000;font-weight:bold;margin:0px;'><span class='glyphicon glyphicon-ok'></span></p></center>";
      } else {
        var new_pb = "<center><p style='color:red;margin:0px;'><span class='glyphicon glyphicon-remove'></span></p></center>";
      }

      // wind
      var wind_ms = row.wind_ms;
      var wind_fpm = (wind_ms * settings.ms_to_fpm).toFixed(2);

      // check legal wind
      if (wind_fpm <= settings.legalwind_fpm ) {
        var legal_wind = "<center><p style='color:#008000;font-weight:bold;margin:0px;'><span class='glyphicon glyphicon-ok'></span></p></center>";
        var wind_legal = true;
      } else {
        var legal_wind = "<center><p style='color:red;margin:0px;'><span class='glyphicon glyphicon-remove'></span></p></center>";
        var wind_legal = false;
      }

      // hats
      var new_hat_speed = Math.floor(speed_miles / 5) * 5;
      if ((new_hat_speed > riders[0].hat) && (new_hat_speed >= 50) && (wind_legal == true)) {
        var new_hat = "<center><p style='color:#008000;font-weight:bold;margin:0px;'>" + new_hat_speed + "</p></center>";
      } else {
        var new_hat = "<center><p style='color:red;margin:0px;'><span class='glyphicon glyphicon-remove'></span></p></center>";
      }

      // wr
      if (parseInt(categories[0].mph) <= speed_miles) {
        var new_wr = "<center><p style='color:#008000;font-weight:bold;margin:0px;'><span class='glyphicon glyphicon-ok'></span></p></center>";
      } else {
        var new_wr = "<center><p style='color:red;margin:0px;'><span class='glyphicon glyphicon-remove'></span></p></center>";
      }

      // only display when completed == true
      if (row.completed == true) {
        dataSet[index] = [
          sessions[0].name,
          riders[0].name,
          riders[0].pb,
          riders[0].hat,
          speed_miles,
          new_pb,
          new_hat,
          categories[0].mph,
          new_wr,
          legal_wind,
          sessions[0].ID
        ];
        index++;
      }
    }
  });

  

  // sort array
  dataSet.sort((a,b) => {
    return a[10] - b[10];
  });

  // Assign data to columns in datatables
  oTable=$('#resultsTable').dataTable({
    "data": dataSet,
    "dom": 'Bfrtip',
    "columns": [
      { "title": "Session"},
      { "title": "Rider" },
      { "title": "Current PB" },
      { "title": "Current Hat"},
      { "title": "Session speed"},
      { "title": "New PB"},
      { "title": "New Hat"},
      { "title": "Current WR"},
      { "title": "New WR"},
      { "title": "Legal Wind"},
      { "title": "ID", "visible": false},
    ],
    order: [[10, 'asc']],
    rowReorder: true,
    responsive: true,
    pageLength: 25,
    buttons: [
      { extend: "csv", editor: editor_new, className: "submit btn btn-primary" },
      { extend: "excel", editor: editor_new, className: "submit btn btn-primary" },
      { extend: "print", editor: editor_new, className: "submit btn btn-primary" },
    ]
  });
}

/* -------------------------------------------------------------------------------- 
Function : initSeeding
Params : none
This function builds the seeding table in the Seeding tab. It gets all the data
from runs during the week, takes the highest speed run and uses this to seed
the rider during slot selection meetings. 
ToDo : 
1) option to pass eternally 
*/ 
function initSeeding() {
  // check if table already exists and then destroy for reloads after edits
  if ( $.fn.DataTable.isDataTable('#seedingTable') ) {
    $('#seedingTable').DataTable().destroy();
  }
  
  var dataSet=[];
  var index=0;

  // get settings for calculatiobs
  var settings=[];

  lib.queryAll("settings", {
    query: function(row) {
      settings[row.name] = row.value;
    }
  });

  // get all riders with highest speed in runs
  var runs = lib.queryAll("runs", {
    query: {"completed": true},
    distinct: ["rider_link"], 
    sort: [["time_in_trap", "ASC"]]
  });
  
  for (var run of runs) {
    var riderLink = run.rider_link;
    // get rider details
    var riders = lib.queryAll("riders", {
      query: {ID: riderLink}
    });

    var categoryLink = riders[0].category;
    // get category details
    var categories = lib.queryAll("categories", {
      query: {name: categoryLink}
    });

    // time to speed
    //var speed_miles = (settings.time_to_mph / run.time_in_trap).toFixed(2);
    var speed_miles = speedMiles(run.time_in_trap);


    // calcuate percentage
    var percentage = (speed_miles / categories[0].mph) * 100; 
    percentage = percentage.toFixed(2);

    // 5 mile am cutoff
    if (speed_miles >= parseInt(settings.cutoff_5_am)) {
      var am_cutoff = "<p style='color:#008000;font-weight:bold;margin-left:20px;'><span class='glyphicon glyphicon-ok'></span></p>";
    } else {
      var am_cutoff = "<p style='color:red;margin-left:20px;'><span class='glyphicon glyphicon-remove'></span></p>";
    }

    // 5 mile pm cutoff
    if (speed_miles >= parseInt(settings.cutoff_5_pm)) {
      var pm_cutoff = "<p style='color:#008000;font-weight:bold;margin-left:20px;'><span class='glyphicon glyphicon-ok'></span></p>";
    } else {
      var pm_cutoff = "<p style='color:red;margin-left:20px;'><span class='glyphicon glyphicon-remove'></span></p>";
    }
    
    dataSet[index] = [
      percentage,
      riders[0].name,
      speed_miles,
      am_cutoff,
      pm_cutoff,
      riders[0].bike,
      riders[0].category
    ];
    index++;
  }

  // Assign data to columns in datatables
  oTable=$('#seedingTable').dataTable({
      "data": dataSet,
      "columns": [
        { "title": "Percentage" },
        { "title": "Rider" },
        { "title": "Max Speed" },
        { "title": "5M AM" },
        { "title": "5M PM" },
        { "title": "Bike" },
        { "title": "Category"},
      ],
      "rowReorder": true,
      "order": [[0, 'desc']],
      "responsive": true,
      "pageLength": 25,
      "paging": false
    });
}

/* -------------------------------------------------------------------------------- 
Function : initDatabasesTable 
Params : none
Creates the table with the existing databases and allows add, edit, delete
ToDo : 
1) 
*/ 
function initDatabasesTable() {
  if ( $.fn.DataTable.isDataTable('#databasesTable') ) {
    $('#databasesTable').DataTable().destroy();
  }

  var index=0;
  var jsonSet = {};

  for (database of databases) {
    jsonSet[index] = [{name: database}];
    index++;
  }

  // set up the editor
  editor = new $.fn.dataTable.Editor( {
    table: "#databasesTable",
    idSrc: 'name',
    fields: [
      {
        label: "Name:",
        name: "name"
      }
    ],
    ajax: function ( method, url, d, successCallback, errorCallback ) {
      var output = { data: [] };

      if ( d.action === 'create' ) {
        var dbName =  d.data[0].name;
        
        console.log('create database ' + dbName);
        // create new database and connect to it. 
        connect2db(dbName);

        databases = allStorage();

        localStorage.setItem('lastDatabase', dbName);

        initDatabasesTable();

        updateDropDown();

      }

      else if ( d.action === 'remove' ) {
        // remove items from localstorage
        $.each( d.data, function (name) {
          console.log('delete database ' + name);

          // drop database
          lib.drop();

          // ARNOLD think about where to connect to now
        } );	
      }

      // show Editor what has changed
      successCallback(output);

      // update screen
      updateScreen();
    }
  } );

  editor.on( 'preSubmit', function ( e, o, action ) {
    if ( action !== 'remove' ) {
      var dbName = this.field('name');

      console.log('presubmit' + dbName.val());
      
      // check duplicates
      if (databases.includes(dbName.val()) == true) {
        dbName.error(dbName.val() + ' already exists. Please use a unique name.');
      }

      // check special chars
      var format = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
      if(format.test(dbName.val())){
        dbName.error('Please use only numbers and letters, no special characters and spaces!');
      }
      
      if ( this.inError() ) {
        return false;
      }

    }
  } );


  // Assign data to columns in datatables
  oTable=$('#databasesTable').dataTable({
    dom: "Bfrtip",
    data: $.map( jsonSet, function (value, key) {
      return value;
    } ),
    columns: [
      { data: "name", title: "Name" },
    ],
    columnDefs: [
      { targets: 0, visible:true }
    ],
    paging: false,
    select: true,
    buttons: [
      { extend: "create", editor: editor, className: "submit btn btn-primary", 
        formMessage: function ( e, dt ) {
          var rows = dt.rows( e.modifier() ).data().pluck('name');
          return 'Enter the name of the new database to create it and connect to it.';
        },
      },
      { extend: "remove", editor: editor, className: "submit btn btn-primary",
        formMessage: function ( e, dt ) {
          var rows = dt.rows( e.modifier() ).data().pluck('name');
          return 'Are you sure you want to delete the '+
            'following databases(s)?<br><b>&#x2022; '+rows.join('<br>&#x2022; ')+'</b><br><br>This will also delete all runs, sessions, riders and cannot be undone! Please backup first if data may be needed.';
        },
        formButtons: [
          'Delete',
          { text: 'Cancel', action: function () { this.close(); } }
        ]
      }
    ],
  });
}

/* -------------------------------------------------------------------------------- 
Function : initSessionsMaintTable 
Params : none
Creates the table with the existing databases and allows add, edit, delete
ToDo : 
1) 
*/ 
function initSessionsMaintTable() {
  if ( $.fn.DataTable.isDataTable('#sessionsMaintTable') ) {
    $('#sessionsMaintTable').DataTable().destroy();
  }

  var index=0;
  var jsonSet = {};

  // get all sessions into data object
  lib.queryAll("sessions", {
    query: function(row) {
      jsonSet[index] = [{id: row.ID, name: row.name, day: row.day, time: row.time, daynr: row.daynr}];
      index++;
    }
  });

  // set up the editor
  editor = new $.fn.dataTable.Editor( {
    table: "#sessionsMaintTable",
    idSrc: 'id',
    fields: [
      { label: "Name:", name: "name"},
      //{ name: "day", label: "Day name", type:  'datetime', format: 'YYYY-MM-DD'},
      //{ name: "time", label: "AM/PM"},
      {
        label:     'Date',
        name:      'daynr',
        type:      'datetime',
        def:       function () { return new Date(); },
        format:    'YYYY-MM-DD',
        fieldInfo: 'Year - Month - Day',
      },
      { 
        label: "AM/PM", 
        name: "time",
        type: "select",
        options: [ 
          {label: 'AM', value: 'AM'},
          {label: 'PM', value: 'PM'},
        ]
      }
      //{ name: "daynr", label: "Order"},
    ],
    ajax: function ( method, url, d, successCallback, errorCallback ) {
      var output = { data: [] };

      if ( d.action === 'create' ) {
        var date = new Date(d.data[0].daynr);
          var dayname = date.toLocaleDateString('en-EN', { weekday: 'long' });

        var name =  d.data[0].name + " (" + d.data[0].time + ")";
        var day = dayname;
        var time = d.data[0].time;
        var daynr = d.data[0].daynr;
        
        // insert sessions into database
        lib.insert("sessions", {name: name, day: day, time: time, daynr: daynr});
        lib.commit();
      }

      else if ( d.action === 'edit' ) {
        // update each edited item with the data submitted
        $.each( d.data, function (id, value) {
          var date = new Date(value.daynr);
            var dayname = date.toLocaleDateString('en-EN', { weekday: 'long' });

          // name is not auto generated here, so users can actually override

          lib.insertOrUpdate("sessions", {ID: id}, {name: value.name, day: dayname, time: value.time, daynr: value.daynr});
          lib.commit();
        } );
      }

      else if ( d.action === 'remove' ) {
        // remove items from localstorage
        $.each( d.data, function (name) {
          console.log(d.data);

          var sessID = d.data[name].id;
          // first select all heats that are in this session
          var heatsData = lib.queryAll("heats", {
            query: {session_link: sessID}
          });

          console.log(heatsData);

          for (heat of heatsData) {
            // delete potential runs
            heatID = heat.ID;
            lib.deleteRows("runs", {heat_link: heatID});

            // then delete heat
            lib.deleteRows("heats", {ID: heatID});
          }

          // then session
          lib.deleteRows("sessions", {ID: sessID});

          // commit
          lib.commit();

          

        } );	
      }

      // show Editor what has changed
      successCallback(output);

      // update screen
      updateScreen();
    }
  } );

  // Assign data to columns in datatables
  oTable=$('#sessionsMaintTable').dataTable({
    dom: "Bfrtip",
    data: $.map( jsonSet, function (value, key) {
      return value;
    } ),
    columns: [
      { data: "name", title: "Session Name"},
      { data: "day", title: "Day name"},
      { data: "time", title: "AM/PM"},
      { data: "daynr", title: "Date"},
    ],
    columnDefs: [
      { targets: 0, visible:true },
    ],
    order: [
      [ 3, 'asc' ],
      [ 2, 'asc']
    ],
    paging: false,
    select: true,
    buttons: [
      { extend: "create", editor: editor, className: "submit btn btn-primary", 
        formMessage: function ( e, dt ) {
          var rows = dt.rows( e.modifier() ).data().pluck('name');
          return 'Enter the details of the new session.';
        },
      },
      { extend: "edit", editor: editor, className: "submit btn btn-primary"},
      { extend: "remove", editor: editor, className: "submit btn btn-primary",
        formMessage: function ( e, dt ) {
          var rows = dt.rows( e.modifier() ).data().pluck('name');
          return 'Are you sure you want to delete the '+
            'following databases(s)?<br><b>&#x2022; '+rows.join('<br>&#x2022; ')+'</b><br><br>This will also delete all runs and heats for this session and cannot be undone! Please backup first if data may be needed.';
        },
        formButtons: [
          'Delete',
          { text: 'Cancel', action: function () { this.close(); } }
        ]
      }
    ],
  });
}

/* -------------------------------------------------------------------------------- 
Function : initHeatsMaintTable 
Params : none
Creates the table with the existing databases and allows add, edit, delete
ToDo : 
1) 
*/ 
function initHeatsMaintTable() {
  if ( $.fn.DataTable.isDataTable('#heatsMaintTable') ) {
    $('#heatsMaintTable').DataTable().destroy();
  }

  var index=0;
  var jsonSet = {};

  // get all heats into table 
  lib.queryAll("heats", {
    query: function(row) {
      var sessionLink = row.session_link;
      // get session info
      var sessionsData = lib.queryAll("sessions", {
        query: {ID: sessionLink}
      });

      var sessionName = sessionsData[0].name

      jsonSet[index] = [{id: row.ID, name: row.name, course: row.course, time: row.time, sessionName: sessionName, sessionId: sessionLink}];
      index++;
    }
  });

  // fill sessions dropdown
  var options = {};
  var sessions = [];
  
  lib.queryAll("sessions", {
    // the callback function is applied to every row in the table
    query: function(row) {
      // push sessions into object for dropdown    
      sessions.push({value: row.ID, label: row.name});
    }
  });

  // assign sessions to options
  options.sessions = sessions;

  // set up the editor
  editor = new $.fn.dataTable.Editor( {
    table: "#heatsMaintTable",
    idSrc: 'id',
    fields: [
      {
        label: "Name:",
        name: "name"
      },
      { 
        label: "Course:", 
        name: "course",
        type: "select",
        options: [ 
          {label: '2.5 mile Qualification', value: 'Qualification 2.5'},
          {label: '5 mile', value: '5 mile'},
          {label: 'Other', value: 'Other'},
        ]
      }, { 
        name: "time", 
        label: "Time of Day",
        type:  'datetime',
                format: 'HH:mm',
                fieldInfo: 'select start time for this heat'
      }, { 
        name: "sessionId", 
        label: "Session", 
        type: "select", 
        options: sessions
      },
    ],
    ajax: function ( method, url, d, successCallback, errorCallback ) {
      var output = { data: [] };

      if ( d.action === 'create' ) {
        console.log(d.data[0]);
        
        var name =  d.data[0].name;
        var course = d.data[0].course;
        var time = d.data[0].time;
        var sessionId = d.data[0].sessionId;
        
        lib.insert("heats", {name: name, course: course, time: time, session_link: sessionId});
        lib.commit();
      }

      else if ( d.action === 'edit' ) {
        // update each edited item with the data submitted	
        $.each( d.data, function (id, value) {
          lib.insertOrUpdate("heats", {ID: id}, {name: value.name, course: value.course, time: value.time, session_link: value.sessionId });
          lib.commit();
        } );
      }

      else if ( d.action === 'remove' ) {
        // remove items from localstorage
        $.each( d.data, function (id) {
          // remove all results from that heath
          lib.deleteRows("runs", {heat_link: id});
          
          // remove heath itself
          lib.deleteRows("heats", {ID: id});

          // commit changes
          lib.commit();
        } );	
      }


      // show Editor what has changed
      successCallback(output);

      // update screen
      updateScreen();
    }
  } );

  // Assign data to columns in datatables
  oTable=$('#heatsMaintTable').dataTable({
    dom: "Bfrtip",
    data: $.map( jsonSet, function (value, key) {
      return value;
    } ),
    columns: [
      { data: "id", title: "ID"},
      { data: "name", title: "Name"},
      { data: "course", title: "Type"},
      { data: "time", title: "Time of Day"},
      { data: "sessionId", title: "SessionID"},
      { data: "sessionName", title: "Session"},
    ],
    columnDefs: [
      { targets: 0, visible:false },
      { targets: 4, visible:false },
    ],
    order: [
      [ 4, 'asc'],
      [ 1, 'asc']
    ],
    paging: false,
    select: true,
    buttons: [
      { extend: "create", editor: editor, className: "submit btn btn-primary", 
        formMessage: function ( e, dt ) {
          return 'Enter the details of the new heat.';
        },
      },
      { extend: "edit", editor: editor, className: "submit btn btn-primary"},
      { extend: "remove", editor: editor, className: "submit btn btn-primary",
        formMessage: function ( e, dt ) {
          var rows = dt.rows( e.modifier() ).data().pluck('name');
          return 'Are you sure you want to delete the '+
            'following heat(s)?<br><b>&#x2022; '+rows.join('<br>&#x2022; ')+'</b><br><br>This will also delete all data from runs in that heat! Please backup first if data may be needed.';
        },
        formButtons: [
          'Delete',
          { text: 'Cancel', action: function () { this.close(); } }
        ]
      }
    ],
  });
}

/* -------------------------------------------------------------------------------- 
Function : updateStarter
Params : none
Creates the table with the existing databases for the start official
ToDo : 
1) 
*/ 
function updateStarter() {
  //update dropdown on starter sheet
  select = document.getElementById('starterSession');
  
  // first empty
  select.options.length = 0;
  
  // get all sesssions
  var sessions = [];

  lib.queryAll("sessions", {
    // the callback function is applied to every row in the table
    query: function(row) {
      // push sessions into object for dropdown    
      sessions.push({value: row.ID, label: row.name});
    }
  });

  // add sessions
  for (session of sessions) {
    opt = document.createElement('option');
    opt.value = session.value;
    opt.innerHTML = session.label;
    select.appendChild(opt);
  }

  // select index -1 so dropdown is blank
  $("#starterSession").prop("selectedIndex", -1);
}

/* -------------------------------------------------------------------------------- 
Function : starterSessions
Params : none
Creates the table with the existing databases for the start official
ToDo : 
1) 
*/ 
function starterSessions(session) {

  document.getElementById("starterContent").innerHTML = "";
  document.getElementById("starterFooter").innerHTML = "";

  // get title
  var select = document.getElementById("starterSession");
  var options = select.getElementsByTagName("option");
  var optionHTML = options[select.selectedIndex].innerHTML;  

  // get date
  var sessDate = lib.queryAll("sessions", {
    query: {"ID": session.value}
  });

  //console.log(sessDate);

  
  document.getElementById("starterContent").innerHTML = "<center><h2>" + optionHTML + " - " + sessDate[0].daynr + "</h2></center>";

  // creates a <table> element and a <tbody> element
  const tbl = document.createElement("table");
  const tblBody = document.createElement("tbody");

  // add header
  const headers = [
    {name: 'Prep Time', width: 10},
    {name: 'Start Time', width: 10},
    {name: 'Rider', width: 20},
    {name: 'Vehicle', width: 20},
    {name: 'Legal Launch', width: 10},
    {name: 'Notes', width: 30}
  ];
  
  var row = document.createElement("tr");
  for (header of headers) {
    const cell = document.createElement("th");
    const cellText = document.createTextNode(header.name);
    cell.setAttribute("width", header.width + "%");
    cell.setAttribute("style", "text-align: center;")
    cell.appendChild(cellText);
    row.appendChild(cell);
  }
  row.setAttribute("style", "background-color:#3FA9F5 !important;")
  tblBody.appendChild(row);
  
  // get all heats for that session
  var heats = lib.queryAll("heats", {
    query: {"session_link": session.value},
    sort: [["time", "ASC"]]
  });

  if (heats.length == 0) {
    // no heats for this session
    // add grey separator row
    row = document.createElement("tr");
    for (let j = 0; j < headers.length; j++) {
      const cell = document.createElement("td");
      const cellText = document.createTextNode(" ");
      cell.setAttribute("style", "background-color:#BCBCBC;height:15px;");
      cell.appendChild(cellText);
      row.appendChild(cell);
    }
    tblBody.appendChild(row);

    var tableRow = document.createElement("tr");
      // add empty line
      for (t = 0; t < 5; t++) {
        var tableCell = document.createElement("td");
        if (t == 0) {
          tableCell.setAttribute("style", "padding-left:5px;font-weight:bold;height:50px;font-size:18px;")
          var tableCellText = document.createTextNode(" - no heats in session - ");
        } else {
          var tableCellText = document.createTextNode(" ");
        }
        tableCell.appendChild(tableCellText);
        tableRow.appendChild(tableCell);
        tableRow.setAttribute("style", "height:50px");
      }

      // add row
      tblBody.appendChild(tableRow);


  }

  for (heat of heats) {
    // reset params
    var dataSet=[];
    var index=1;
    var jsonSet = {};

    // there is a heat for this section
    var heatID = heat.ID;

    //console.log(heat.ID + " " + heat.name);
    
    // add title if not existent, first clean entry
    var rowId = heat.name;
    rowId = rowId.replace(/ /g,"_");
    rowId = rowId.replace(/\./g,"_");


    // add grey separator row
    row = document.createElement("tr");
    for (let j = 0; j < headers.length; j++) {
      const cell = document.createElement("td");
      const cellText = document.createTextNode(" ");
      cell.setAttribute("style", "background-color:#BCBCBC;height:15px;");
      cell.appendChild(cellText);
      row.appendChild(cell);
    }
    tblBody.appendChild(row);

    // add table section for this heat
    row = document.createElement("tr");
    const cell = document.createElement("td");
    const cellText = document.createTextNode(heat.name);
    cell.setAttribute("style", "padding-left:5px;font-weight:bold;height:50px;font-size:18px;");
    cell.appendChild(cellText);
    row.setAttribute("class", "heatRow");
    row.appendChild(cell);

    // add heat start time
    const cell1a = document.createElement("td");
    const cellText1a = document.createTextNode(heat.time);
    cell1a.setAttribute("style", "padding-left:5px;font-weight:bold;");
    cell1a.appendChild(cellText1a);
    row.appendChild(cell1a);

    // finish first row
    for (let j = 0; j < headers.length -2; j++) {
      const cell = document.createElement("td");
      const cellText = document.createTextNode(" ");
      cell.appendChild(cellText);
      row.appendChild(cell);
    }
    tblBody.appendChild(row);

    // add row with road closed info
    const row2 = document.createElement("tr");
    const cell2 = document.createElement("td");
    cell2.setAttribute("colspan", headers.length);
    const cellText2 = document.createTextNode("Road Closed: ____________   Sweep arrived: ____________   Start 20 min: ____________   End 20 min: ___________ ");
    cell2.setAttribute("style", "font-weight:bold;height:50px;padding-left:5px;");
    cell2.appendChild(cellText2);
    row2.appendChild(cell2);
    tblBody.appendChild(row2);
    
    // now query runs
    lib.queryAll("runs", {
      query: function(row) { 
        if (row.heat_link == heatID) {
          var riderLink = row.rider_link;

          // 
          var riders = lib.queryAll("riders", {
            query: {ID: riderLink}
          });
          
          // results from dataset
          var launch_time = row.launch_time;
          var riderName =riders[0].name;
          var bikeName = riders[0].bike;
          var category = riders[0].category;
          var trap_time = row.time_in_trap;
          var wind_ms = row.wind_ms;
          var note = row.note;
          var observations = row.observations;

          // create table row
          var tableRow = document.createElement("tr");
          var tableCell = document.createElement("td");
          if (observations != "Running") {
            if (observations == "On Deck") {
              var tableCellText = document.createTextNode("OD");
            } else {
              // use below to show other statusses in the starter sheet
              //var tableCellText = document.createTextNode(observations);
              var tableCellText = document.createTextNode(" ");
            }
          } else {
            var tableCellText = document.createTextNode(" ");
          }
          tableCell.setAttribute("style", "padding-left:5px;")
          tableCell.appendChild(tableCellText);
          tableRow.appendChild(tableCell);

          // add empty cell that will contain start time
          var tableCell = document.createElement("td");
          var tableCellText = document.createTextNode(" ");
          tableCell.appendChild(tableCellText);
          tableRow.appendChild(tableCell);

          // add rider name
          var tableCell = document.createElement("td");
          var tableCellText = document.createTextNode(riderName);
          tableCell.setAttribute("style", "padding-left:5px;")
          tableCell.appendChild(tableCellText);
          tableRow.appendChild(tableCell);

          // add bike name
          var tableCell = document.createElement("td");
          var tableCellText = document.createTextNode(bikeName);
          tableCell.setAttribute("style", "padding-left:5px;")
          tableCell.appendChild(tableCellText);
          tableRow.appendChild(tableCell);

          // add empty cell that will legal launch
          var tableCell = document.createElement("td");
          var tableCellText = document.createTextNode(" ");
          tableCell.appendChild(tableCellText);
          tableRow.appendChild(tableCell);

          // add empty cell that will contain notes
          var tableCell = document.createElement("td");
          var tableCellText = document.createTextNode(" ");
          tableCell.appendChild(tableCellText);
          
          if(index % 2 == 0) {
            tableRow.setAttribute("style", "height:50px;background-color:#F1F1F1;");
          } else {
            tableRow.setAttribute("style", "height:50px");
          }
          
          tableRow.appendChild(tableCell);


          tblBody.appendChild(tableRow);
          index++;
        } 
      }
    });

    if (index == 1) {
      // no rexords for this session
      //console.log('no records for ' + heatID);

      var tableRow = document.createElement("tr");
      // add empty line
      for (t = 0; t < 5; t++) {
        var tableCell = document.createElement("td");
        if (t == 2) {
          tableCell.setAttribute("style", "padding-left:5px;")
          var tableCellText = document.createTextNode(" - no runs in this heat - ");
        } else {
          var tableCellText = document.createTextNode(" ");
        }
        tableCell.appendChild(tableCellText);
        tableRow.appendChild(tableCell);
        tableRow.setAttribute("style", "height:50px");
      }

      // add row
      tblBody.appendChild(tableRow);
    }
  }

  // put the <tbody> in the <table>
  tbl.appendChild(tblBody);
  // appends <table> into <body>
  $("#starterContent").append(tbl);
  // sets the border attribute of tbl to '2'
  tbl.setAttribute("border", "1");
  tbl.setAttribute("width", "90%");
  tbl.setAttribute("style", "margin:auto;");

  document.getElementById("starterFooter").innerHTML += '<br><center><a onclick="printSheet()" href="#"><img src="images/printer.png" width="48px"></a>';
}
/* -------------------------------------------------------------------------------- 
Function : makeid
Params : none
This function creates a random ID
*/ 
function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/* -------------------------------------------------------------------------------- 
Function : printSheet
Params : control
This function changes the localstorage database we are using. Takes the params:
1) control -> the control element from the dropdown, control.value holds the actual val
ToDo : 
1) 
*/ 
function printSheet() {
  // get content
  var divToPrint = document.getElementById('starterContent');
      
  // open new window with random ID to bust cache
  newWin = window.open("?" + makeid(25));
  newWin.document.write('<style type = "text/css">');
  newWin.document.write('body{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;font-family:arial;}');
  newWin.document.write('table {width: 100%;}');
  newWin.document.write('table, tr, td, th {border:1px solid black;border-collapse:collapse;}');
  
  // check rows that are marked as heats to get some form of zoom control, more rows means more zoom out
  var rows= $('#starterContent tbody .heatRow').length;
  if (rows < 5) {
    newWin.document.write('@media print {@page {size: A3;} html{zoom:100%;}}');
  } else if (rows >= 5) {
    console.log("rows = " + rows);
    newWin.document.write('@media print {@page {size: A3;} html{zoom:80%;}}');
  }
  newWin.document.write('</style><body>');
  newWin.document.write(divToPrint.innerHTML);
  newWin.document.write('</body>');
      newWin.print();
      newWin.close();
}


/* -------------------------------------------------------------------------------- 
Function : yearChange
Params : control
This function changes the localstorage database we are using. Takes the params:
1) control -> the control element from the dropdown, control.value holds the actual val
ToDo : 
1) 
*/ 
function dbChange(control) {
  var lib;
  
  var currentDatabase = control.value;

  // update year in localstorage to survive reloads
  localStorage.setItem('lastDatabase', control.value);

  select = document.getElementById('selectedYear');
  select.value = currentDatabase;
  connect2db(currentDatabase);
  
}

/* -------------------------------------------------------------------------------- 
Function : download
Params : data, filename, type
This function allows for download of the data in the localstorage object and 
convert it to a file download. Takes the params:
1) data -> the data that should be in the file
2) filename -> the filename to save to
3) type -> the type of information in the file
ToDo : 
1) 
*/ 
function download(data, filename, type) {
  console.log(data);
  var file = new Blob([data], {type: type});
  if (window.navigator.msSaveOrOpenBlob) // IE10+
    window.navigator.msSaveOrOpenBlob(file, filename);
  else { // Others
    var a = document.createElement("a"), url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);  
    }, 0); 
  }
}

/* -------------------------------------------------------------------------------- 
Function : loadJSON 
Params : file
Loads the JSON in the user selected file and imports it in localStorage keys.
ToDo : 
1) 
*/ 
function loadJSON(o) {
  if (localStorage.getItem("lastDatabase") !== null) {
    var currentDatabase = localStorage.getItem('lastDatabase');
  } else {
    var currentDatabase = new Date().getFullYear();
  }
  
  if( ! confirm("Do you really want to do this?\n\nThis will overwrite any existing data in the database " + currentDatabase + "!") ) {
      //e.preventDefault(); // ! => don't want to do this
  } else {
    //want to do this! 
    var fr = new FileReader();
    
    fr.onload = function() {
      var json = fr.result;
      var data = JSON.parse(json);
      
      //console.log(json);
      

      // loop over all items and store in localstorage
      Object.keys(data).forEach(function (k) {
        var detailedData = data[k];
        if (k == "tables") {
          // handling table creation
          Object.keys(data[k]).forEach(function (m) {
            
            // unravel data incoming
            var incomingFields = detailedData[m].fields;
            var fields = [];
            incomingFields.forEach(function (item, index) {
              console.log("item: " + item);
              fields.push(item);
            });
            // drop existing table
            if (lib.tableExists(m)) {
              lib.dropTable(m);
            }
            // create table newly from uploaded data. 
            lib.createTable(m, fields);
          });
          lib.commit();

        } else if (k == "data" ) {
          Object.keys(data[k]).forEach(function (m) {
            var data2insert = detailedData[m];
            for (var key in data2insert) {
              if (data2insert.hasOwnProperty(key)) {				
                var entry = data2insert[key];
                lib.insert(m, entry);
                lib.commit();
              }
            }
          });
        }	
      });
      
      // reload screens 
      updateScreen();
    };
    fr.readAsText(o.files[0]);			
  }
  // clear input
  $("#loadJSON").val(null);
}

/* -------------------------------------------------------------------------------- 
Function : loadJSONData 
Params : file
Loads the JSON in the user selected file and Insert or Update the records in the 
local database. This does not include updating the tables or dropping the database.
ToDo : 
1) 
*/ 
function loadJSONData(o) {
  
  if (localStorage.getItem("lastDatabase") !== null) {
    var currentDatabase = localStorage.getItem('lastDatabase');
  } else {
    var currentDatabase = new Date().getFullYear();
  }

  if( ! confirm("Do you really want to do this?\n\nThis will update all riders, results, heats and sessions, except for the notes in the sessions in " + currentDatabase + ".") ) {
      //e.preventDefault(); // ! => don't want to do this
  } else {
  

    //want to do this! 
    var fr = new FileReader();

    fr.onload = function() {
      var json = fr.result;
      var data = JSON.parse(json);
      
      // loop over all items and store in localstorage
      Object.keys(data).forEach(function (k) {
        // k = table
        // k[data] = dataobject
        var detailedData = data[k];
                  
        // do not update notes in riders and runs
        for (let x in detailedData) {
          console.log(x + ": "+ JSON.stringify(detailedData[x]));
          if ((k == "riders") || (k == "runs")) {
            delete detailedData[x].note;
          }
          lib.insertOrUpdate(k, {ID: detailedData[x].ID}, detailedData[x]);
          lib.commit();
        }					
      });
      // reload screens 
      updateScreen();
    };
    var file = o.files[0];
    var fileName = file.name;
    var fileResult = fileName.includes("_DATA_");
    if (fileResult) {
      fr.readAsText(o.files[0]);			
    } else {
      alert("This only imports file with _DATA_ in the name!")
    }
  }

  // clear input
  $("#loadJSONData").val(null);

}

// list all databases
function allStorage() {
  var archive = [],
  keys = Object.keys(localStorage),
  i = 0, 
  key;
  
  for (; key = keys[i]; i++) {
    var value = key.split("_");
    if (value[0] == "db") {
      if (archive.indexOf(parseInt(value[1])) === -1) {
        archive.push(parseInt(value[1]));
      }
    }
  }
  
  return archive;
}
  
$(document).ready(async function(){
  // set debug
  var debug = "console";
  var currentPosition = 0;

  // get al databases into object
  databases = allStorage();

  // check if a year is stored in localstorage, else load current year
  if (localStorage.getItem("lastDatabase") !== null) {
    var currentDatabase = localStorage.getItem('lastDatabase');
  } else {
    var currentDatabase = new Date().getFullYear();
  }

  var dbCon = await connect2db(currentDatabase);

  //updateScreen();

  // Javascript to enable link to tab
  var hash = document.location.hash;
  if (hash) {
    $('.nav-tabs a[href=\\'+hash+']').tab('show');
  } 
 
  // Change hash for page-reload
  $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
    window.location.hash = e.target.hash;
  });
  
  // Download all data for export
  $('#json_down').click(function () {
    
    // get selected year 
    var selectedYearDropDown = $('#selectedYear').val();

    // get current date time
    var currentdate = new Date(); 
    var datetime = currentdate.getDate() + "-"
              + (currentdate.getMonth()+1)  + "-" 
              + currentdate.getFullYear() + "@"  
              + currentdate.getHours() + ":"  
              + currentdate.getMinutes();
    
    // serialize the data for export
    var data = lib.serialize();

    // file properties
    filename = selectedYearDropDown + "_COMPLETE_export_" + datetime + ".json";
    type = "text/plain";
    download(data, filename, type);	
  });

  // download only data, not table structure
  $('#json_part').click(function () {
    
    // get selected year 
    var selectedYearDropDown = $('#selectedYear').val();

    // get current date time
    var currentdate = new Date(); 
    var datetime = currentdate.getDate() + "-"
              + (currentdate.getMonth()+1)  + "-" 
              + currentdate.getFullYear() + "@"  
              + currentdate.getHours() + ":"  
              + currentdate.getMinutes();
    
    // serialize the data for export
    var jsonData = lib.serialize();
    var data = JSON.parse(jsonData);
    data = JSON.stringify(data.data);

    // file properties
    filename = selectedYearDropDown + "_DATA_export_" + datetime + ".json";
    type = "text/plain";
    download(data, filename, type);	
  });
});