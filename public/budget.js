$(document).ready(function(){

  Budget = {};

  Budget.Init = {

    /*
    * Initialize everything the app needs
    * Load the expense and income line item global variables
    */
    setup: function(){
      this.loadExpenseLineItems();
      this.loadIncomeLineItems();
    },

    /*
    * Adjust an array of line items and return the same line items with the values for the years adjusted for inflation
    * Needs an inflationDivisor object with values for how much to divide each year to get the correct inflation
    * Base currently year is 1976
    */
    adjustForInflation: function(lineItems){
      var inflation = [];
      var inflationDivisor = {
        '1976':'1', '1977':'1.065', '1978':'1.14594', '1979':'1.27543122', '1980':'1.4476144347', '1981':'1.5967187214741', '1982':'1.69571528220549', '1983':'1.74997817123607', '1984':'1.82522723259922', '1985':'1.89093541297279', '1986':'1.92686318581928', '1987':'1.99623026050877', '1988':'2.07807570118963', '1989':'2.17782333484673', '1990':'2.29542579492845', '1991':'2.39183367831545', '1992':'2.46358868866491', '1993':'2.53749634932486', '1994':'2.60347125440731', '1995':'2.67636844953071', '1996':'2.75665950301663', '1997':'2.82006267158602', '1998':'2.86518367433139', '1999':'2.92821771516668', '2000':'3.02777711748235', '2001':'3.11255487677186', '2002':'3.16235575480021', '2003':'3.23508993716061', '2004':'3.32243736546395', '2005':'3.43540023588972', '2006':'3.54533304343819', '2007':'3.64460236865446', '2008':'3.78309725866333', '2009':'3.76796486962868', '2010':'3.82825230754274', '2011':'3.9507563813841', '2012':'4.03372226539317', '2013':'4.15473393335497'
      };
      var years = _.range(1976, 2018);
      _.each(lineItems, function(i){
          var l = JSON.parse(JSON.stringify(i));
        _.each(years, function(y){
          l[y] = l[y].replace(/\,/g,'') / inflationDivisor[y];
          l[y] = Math.round(l[y]).toString();
        });
        inflation.push(l);
      });
      return inflation;
    },

    /*
    * Adjust an array of line items and return the same line items with the values as per capita numbers
    * Needs the population per year.
    */
    adjustPerCapita: function(lineItems){
      var perCapita= [];
      var perCapitaDivisor = {
        '2013': '310000', '2012': '310000', '2011': '310000', '2010': '309349.689', '2009': '306771.529', '2008': '304093.966', '2007': '301231.207', '2006': '298379.912', '2005': '295516.599', '2004': '292805.298', '2003': '290107.933', '2002': '287625.193', '2001': '284968.955', '2000': '282162.411', '1999': '272690.813', '1998': '270248.003', '1997': '267783.607', '1996': '265228.572', '1995': '262803.276', '1994': '260327.021', '1993': '257782.608', '1992': '255029.699', '1991': '252153.092', '1990': '249464.396', '1989': '246819.23', '1988': '244498.982', '1987': '242288.918', '1986': '240132.887', '1985': '237923.795', '1984': '235824.902', '1983': '233791.994', '1982': '231664.458', '1981': '229465.714', '1980': '227224.681', '1979': '225055.487', '1978': '222584.545', '1977': '220239.425', '1976': '218035.164'
      };
      var years = _.range(1976, 2018);
      _.each(lineItems, function(i){
          var l = JSON.parse(JSON.stringify(i));
        _.each(years, function(y){
          l[y] = l[y].replace(/\,/g,'') / perCapitaDivisor[y];
          //l[y] = Math.round(l[y]).toString();
          l[y] = l[y].toString();
        });
        perCapita.push(l);
      });
      return perCapita;
    },

    /*
    * Set up the global variables of expenseLineItem and inflationExpenseItems from the budget expenses csv
    */
    loadExpenseLineItems: function(){
      var items = [];
      var that = this;
      d3.csv('public/us_budget_expenses_2013.csv', function(csv){
        $.each(csv, function(row, data){
          items.push(data);
        });
        expenseLineItems = items;
        inflationExpenseItems = that.adjustForInflation(items);
        perCapitaExpenseItems = that.adjustPerCapita(items);
        perCapitaInflationExpenseItems = that.adjustPerCapita(inflationExpenseItems);
      });
    },

    /*
    * Set up the global variables for income line items and inflation adjusted from the budged receipts csv
    */
    loadIncomeLineItems: function(){
      var items = [];
      var that = this;
      d3.csv('public/us_budget_revenues_2013.csv', function(csv){
        $.each(csv, function(row, data){
          items.push(data);
        });
        incomeLineItems = items;
        inflationIncomeItems = that.adjustForInflation(items);
        perCapitaIncomeItems = that.adjustPerCapita(items);
        perCapitaInflationIncomeItems = that.adjustPerCapita(inflationIncomeItems);
      });
    }
  };

  /*
  * The state object tracks the state of the view, and knows which
  * information to pass along to get to different visualization levels
  *
  * There are a number of things we track:
  * inflation / infaltion adjusted
  * the year we are looking at
  * the level of the visualization: at budget level, agency, or bureau
  */
  Budget.State = {
    yearTracker: '2011',
    typeTracker: "expenses",
    moneyTracker: "normal",
    capitaTracker: "total",
    treemapClicks: 0,

    /*
    * Returns the name of either the agency or the bureau that is
    * currently shown on the treemap
    */
    treemapLevelName: function(){
      if(typeof this.bureauTracker !== "undefined"){
        return this.bureauTracker;
      } else if(typeof this.agencyTracker !== "undefined"){
        return this.agencyTracker;
      } else {
        return false;
      }
    },

    /*
    * Is the current visualization at the budget level?
    */
    atBudgetLevel: function(){
      if(typeof this.levelTracker === "undefined" || this.levelTracker === "budget"){
        return true;
      } else {
        return false;
      }
    },

    /*
    * Reset the state of the visualization to be at the budget level for the year
    */
    resetState: function(){
      this.removeTrackers();
      if(this.typeTracker === 'expenses'){
        this.levelTracker = "budget";
        return Budget.Expenses.getTopLevelAgencies(this.yearTracker);
      } else {
        this.levelTracker = "budget";
        return Budget.Receipts.budgetReceipts(this.yearTracker);
      }
    },

    /*
    * Get the current expense items based on the inflation tracker
    */
    currentExpenseItems: function(){
      if(this.capitaTracker === "total"){
        if(this.moneyTracker === "normal"){
          return expenseLineItems;
        } else if(this.moneyTracker === "inflation"){
          return inflationExpenseItems;
        }
      } else if(this.capitaTracker === "per_capita") {
        if(this.moneyTracker === "normal"){
          return perCapitaExpenseItems;
        } else if(this.moneyTracker === "inflation"){
          return perCapitaInflationExpenseItems;
        }
      }
    },

    /*
    * Get the current income items based on the inflation tracker
    */
    currentIncomeItems: function(){
      if(this.capitaTracker === "total"){
        if(this.moneyTracker === "normal"){
          return incomeLineItems;
        } else if(this.moneyTracker === "inflation"){
          return inflationIncomeItems;
        }
      } else if(this.capitaTracker === "per_capita") {
        if(this.moneyTracker === "normal"){
          return perCapitaIncomeItems;
        } else if(this.moneyTracker === "inflation"){
          return perCapitaInflationIncomeItems;
        }
      }
    },
    /*
    * Remove all the variables that track the current state
    */
    removeTrackers: function(){
      $('.agency').html('');
      $('.bureau').html('');
      delete this.lastItem;
      delete this.levelTracker;
      delete this.agencyTracker;
      delete this.bureauTracker;
    },

    /*
    * Get the data that wee need to create the treemap, based on the
    * current state of the treemap. Optional noAdvance param to not
    * advance the state of the treemap when getting the information.
    * aka: when switching years or to inflation adjusted, we want to
    * stay at the same level of budget/bureau/agency but want new data
    * based on the new state of the year / inlation trackers
    */
    treemapDataFromState: function(name, noAdvance){
      this.lastItem = name;

      if(typeof noAdvance === "undefined"){
        this.advanceLevel(name);
      }

      if(typeof this.levelTracker === "undefined" || typeof name === "undefined"){
        return this.resetState();
      } else if(this.typeTracker === "expenses"){
        return this.treemapExpenseData(name);
      } else if(this.typeTracker === "receipts"){
        return this.treemapReceiptData(name);
      }
    },

    /*
    * Advance the level of the visualization, from:
    * Budget (shows the overall budget in its entirety) ->
    * agency (shows a single agency) ->
    * bureau (shows a single bureau within an agency and all its line item expenses)
    *
    * circle back to the budget level when advancing from bureau
    */
    advanceLevel: function(name){
      if(this.levelTracker === "budget"){
        $('.agency').html("<strong>Department:</strong> " + name);
        this.levelTracker = "agency";
        this.agencyTracker = name;
      } else if(this.levelTracker === "agency"){
        $('.bureau').html("<strong>Bureau:</strong> " + name);
        this.levelTracker = "bureau";
        this.bureauTracker = name;
      } else {
        this.levelTracker = "budget";
      }
    },

    /*
    * Get the data we need to create the treemap when looking for expenses
    */
    treemapExpenseData: function(name){
      if(this.levelTracker === "agency"){
        return Budget.Expenses.getYearlyAgency(this.yearTracker, name);
      } else if(this.levelTracker === "bureau"){
        return Budget.Expenses.getYearlyBureau(this.yearTracker, this.agencyTracker, name);
      } else {
        return this.resetState();
      }
    },

    /*
    * Get the data we need to create the treemap when looking for receipts
    */
    treemapReceiptData: function(name){
      if(this.levelTracker === "agency"){
        return Budget.Receipts.agencyReceipts(this.yearTracker, name);
      } else if(this.levelTracker === "bureau"){
        return Budget.Receipts.bureauReceipts(this.yearTracker, this.agencyTracker, name);
      } else {
        return this.resetState();
      }
    },

    /*
    * Get the data we need to create the area graph
    */
    areaGraphData: function(name){
      if(this.typeTracker === "receipts") {
        if(this.levelTracker === "budget") {
          return Budget.Receipts.getHistorical(name);
        } else if(this.levelTracker === "agency") {
          return Budget.Receipts.getHistorical(this.agencyTracker, name);
        } else {
          return Budget.Receipts.getHistorical(this.agencyTracker, this.bureauTracker, name);
        }
      } else {
        if(this.levelTracker === "budget") {
          return Budget.Expenses.getHistorical(name);
        } else if(this.levelTracker === "agency") {
          return Budget.Expenses.getHistorical(this.agencyTracker, name);
        } else {
          return Budget.Expenses.getHistorical(this.agencyTracker, this.bureauTracker, name);
        }
      }

    }


  };


  Budget.Expenses = {

    /*
    * Get the agency, bureau, and account name from a single line item
    */
    expenseOrigin: function(item){
      return {
        "agencyName" : item['Agency Name'],
        "bureauName" : item['Bureau Name'],
        "name" : item['Account Name'],
        "uniqueName" : item['Unique']
      };
    },

    /*
    * Takes a single line item and year, and returns the data necessary for the treemap
    * Namely: the agencyName, Bureau Name, Account Name, and amount for the year
    */
    getYearlyLineItem: function(item, year){
      var lineItem = this.expenseOrigin(item);
      lineItem.size = parseFloat(item[year].replace(/\,/g,''));
      return lineItem;
    },

    /*
    * Gets the historical amounts for a set of line items for use in the area chart
    * takes required agencyName, but bureauName and accountName are optional
    * Returns an array of objects with dates and amounts, which can be graphed
    * If you pass agencyName = "Department of Agriculture", it will return the total sum
    * of all dept of agriculture expenses between 1976 and 2012 each year
    */
    getHistorical: function(agencyName, bureauName, accountName){
      var historical = [];
      var expenseItems = Budget.State.currentExpenseItems();
      var rows = _.filter(expenseItems, function(r){
        if(typeof accountName !== "undefined"){
          return r['Agency Name'] === agencyName && r['Bureau Name'] === bureauName && r['Account Name'] === accountName;
        } else if(typeof bureauName !== "undefined"){
          return r['Agency Name'] === agencyName && r['Bureau Name'] === bureauName;
        } else if(typeof agencyName !== "undefined"){
          return r['Agency Name'] === agencyName;
        } else {
          return false;
        }
      });
      var years = _.range(1976, 2013);
      _.each(years, function(y){
        var amount = _.reduce(rows,function(sum, r){
          return sum + parseFloat(r[y].replace(/\,/g,''));
        },0);
        var year = '1/1/' + y;
        var period = new Date(year);
        historical.push({"date" : period, "amount" : amount});
      });
      return historical;
    },

    /*
    * Returns the agency name, bureau name, expense name and amount for all expense
    * line items in the provided year.
    */
    getYearlyExpenses: function(year){
      var that = this;
      var expenseItems = Budget.State.currentExpenseItems();
      var yearlyBudget = expenseItems.map(
        function(x) { return that.getYearlyLineItem(x, year); }
      );
      return yearlyBudget;
    },

    // Only use the normal amount for top level year summary data
    yearlyExpenseSummary: function(year){
      var that = this;
      var expenseItems = expenseLineItems;
      var yearlyBudget = expenseItems.map(
        function(x) { return that.getYearlyLineItem(x, year); }
      );
      return yearlyBudget;
    },

    /*
    * Get all the nested data for a given year. Everything has name, size, and children
    * attributes.
    *
    * At the top level is named "us_budget" and has all 214 agencies as children
    * The agencies each have a name, size, and have all the bureaus as children
    * The bureaus have a name and size and have the individual expenses as children
    * The individual expenses have a name and size
    */
    getYearlyData: function(year){
      var d = this.getNestedData(year);
      var that = this;

      var data = _.map(d, function(val , key){
        var agencyChildren = that.getAgencyChildren(val);
        return {
          "name" : key,
          "children" : agencyChildren,
          "size" : _.reduce(agencyChildren, function(sum, num){
          return sum + num.size;},0)
        };
      });

      var sortedData = _.sortBy(data, function(d){return 1 * d.size; });

      return {"name" : "us_budget", "children" : sortedData};
    },

    /*
    * This returns the us budget object with the top level agencies as children
    * However, the agencies themselves do not include children. They only have
    * name and size attributes.
    */
    getTopLevelAgencies: function(year){
      var that = this;
      var d = this.getNestedData(year);

      var data = _.map(d, function(val , key){
        var agencyChildren = that.getAgencyChildren(val);
        return {
          "name" : key,
          "size" : _.reduce(agencyChildren, function(sum, num){
          return sum + num.size;},0)
        };
      });

      var sortedData = _.sortBy(data, function(d){return 1 * d.size; });

      return {"name" : "us_budget", "children" : sortedData};
    },

    /*
    * Use the d3 next function to change the data into a nested js object by
    * agencies and then by bureau
    */
    getNestedData: function(year){
      var data2 = d3.nest()
        .key(function(d) {return d.agencyName;})
        .key(function(d) {return d.bureauName;})
        .map(this.getYearlyExpenses(year));
      return data2;
    },

    /*
    * For an agency or bureau, gets the children, aka the line items for each.
    *
    * This returns a js object
    */
    getAgencyChildren: function(r){
     var agency_children = _.map(r, function(val, key){
       return {
         "name" : key,
         "parent" : r.name,
         "children" : val,
         "size" : _.reduce(val, function(sum, num){
           return sum + num.size;}, 0)
       };
     });

     return agency_children;
    },

    getYearlyAgency: function(year, agency){
      var d = this.getYearlyData(year);
      var w = _.where(d.children, { "name" : agency })[0];
      return {
        "name" : agency,
        "children" : _.map(w.children, function(n){return _.pick(n, 'name', 'size');})
      };
    },

    getYearlyBureau: function(year, agency, bureau){
      var d = this.getYearlyData(year);
      var a = _.where(d.children, { "name" : agency })[0];
      return _.where(a.children, { "name" : bureau})[0];
    }
  };

  Budget.Receipts = {
    getHistorical: function(agencyName, bureauName, accountName){
      var historical = [];
      var incomeItems = Budget.State.currentIncomeItems();
      var rows = _.filter(incomeItems, function(r){
        if(typeof accountName !== "undefined"){
          return r['Agency name'] === agencyName && r['Bureau name'] === bureauName && r['Account name'] === accountName;
        } else if(typeof bureauName !== "undefined"){
          return r['Agency name'] === agencyName && r['Bureau name'] === bureauName;
        } else if(typeof agencyName !== "undefined"){
          return r['Agency name'] === agencyName;
        } else {
          return false;
        }
      });
      var years = _.range(1976, 2013);
      _.each(years, function(y){
        var amount = _.reduce(rows,function(sum, r){
          return sum + parseFloat(r[y].replace(/\,/g,''));
        },0);
        var year = '1/1/' + y;
        var period = new Date(year);
        historical.push({"date" : period, "amount" : amount});
      });
      return historical;
    },

    receiptItem: function(item){
      return {
        "agencyName" : item["Agency name"],
        "bureauName" : item["Bureau name"],
        "name" : item["Account name"]
      };
    },

    receiptForYear: function(receipt, year){
      var receiptItem = this.receiptItem(receipt);
      receiptItem.size = parseFloat(receipt[year].replace(/\,/g,''));
      return receiptItem;
    },

    yearlyReceipts: function(year){
      var that = this;
      var incomeItems = Budget.State.currentIncomeItems();
      return incomeItems.map(
        function(x) { return that.receiptForYear(x,year); }
      );
    },

    yearlyReceiptsSummary: function(year){
      var that = this;
      var incomeItems = incomeLineItems;
      return incomeItems.map(
        function(x) { return that.receiptForYear(x,year); }
      );
    },

    receiptsData: function(year){
      var d = this.nestedReceipts(year);
      var that = this;

      var data = _.map(d, function(val , key){
        var agencyChildren = that.agencyChildren(val);
        return {
          "name" : key,
          "children" : agencyChildren,
          "size" : _.reduce(agencyChildren, function(sum, num){
          return sum + num.size;},0)
        };
      });

      var sortedData = _.sortBy(data, function(d){return 1 * d.size; });

      return {"name" : "us_budget", "children" : sortedData};
    },

    nestedReceipts: function(year){
      var nestedReceipts = d3.nest()
        .key(function(d) { return d['agencyName']; })
        .key(function(d) { return d['bureauName']; })
        .map(this.yearlyReceipts(year));
      return nestedReceipts;
    },

    budgetReceipts: function(year){
      var that = this;
      var d = this.nestedReceipts(year);

      var data = _.map(d, function(val , key){
        var agencyChildren = that.agencyChildren(val);
        return {
          "name" : key,
          "size" : _.reduce(agencyChildren, function(sum, num){
          return sum + num.size;},0)
        };
      });

      var sortedData = _.sortBy(data, function(d){return 1 * d.size; });

      return {"name" : "us_budget", "children" : sortedData};
    },

    agencyReceipts: function(year, agency){
      var d = this.receiptsData(year);
      var w = _.where(d.children, { "name" : agency })[0];
      return {
        "name" : agency,
        "children" : _.map(w.children, function(n){return _.pick(n, 'name', 'size');})
      };
    },

    bureauReceipts: function(year, agency, bureau){
      var d = this.receiptsData(year);
      var a = _.where(d.children, { "name" : agency })[0];
      return _.where(a.children, { "name" : bureau})[0];
    },

    agencyChildren: function(r){
     var agency_children = _.map(r, function(val, key){
       return {
         "name" : key,
         "parent" : r.name,
         "children" : val,
         "size" : _.reduce(val, function(sum, num){
           return sum + num.size;}, 0)
       };
     });

     return agency_children;
    }
  };



  // http://bost.ocks.org/mike/treemap/
  Budget.Display = {
    setupTreemap: function(data){
      var w = $(window).width()* 0.7,
          h = w * (500/960),
          x = d3.scale.linear().range([0, w]),
          y = d3.scale.linear().range([0, h]),
          root,
          chartData,
          node,
          that = this;

      // color = d3.scale.category20c();
      //color = d3.scale.linear().domain([0,100]).range(['brown', 'yellow']);

      var palette = ["#c44d58", "#ff6b6b", "#77cca4", "#4ecdc4", "#556270", "#88419d", "#6a4a3c"];
      var palette2 = ["#cc333f", "#edc951", "#eb6841", "#6a4a3c", "#00a0b0"];

      color = d3.scale.threshold()
        .domain([1,2,7,15,20,40, 101])
        .range(palette.reverse());


      tooltip = d3.select("#chart")
        .append("div")
        .attr("class", "tooltip treemapTooltip")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .text("a simple tooltip");

      treemap = d3.layout.treemap()
          .size([w, h])
          .sticky(false)
          .sort(function(a,b) { return a.size - b.size; })
          .round(false)
          .ratio(h / w * 0.5 * (1 + Math.sqrt(5)))
          .value(function(d) { return d.size; });


      svg = d3.select("#chart").append("div")
          .attr("class", "chart")
          .style("width", w + "px")
          .style("height", h + "px")
        .append("svg:svg")
          .attr("width", w)
          .attr("height", h)
        .append("svg:g")
          .attr("class", "chartSvgSelect");
    },

    updateTreemapData: function(data){
      var that = this;
      var filteredData = {
        name: data.name,
        children: _.filter(data.children, function(d){ return d.size > 0; })
      };
      var nodes = treemap.nodes(filteredData);

      var percentOfParent = function(d){
        if(typeof d.parent === 'undefined'){
          return 100;
        } else {
          return (d.size / d.parent.value) * 100;
        }
      };

      var cellColor = function(d){
        var percent = percentOfParent(d);
        return color(percent);
      };

      var tooltipMessage = function(d){
        var msg = d.name;
        if(Budget.State.capitaTracker === "per_capita"){
          if(d.size){
            msg += " : <div class='treemap_text_details'>$";
            msg += (d.size).toFixed(2).replace(/(\d)(?=(\d{3})+\b)/g,'$1,');
            msg += " Per Person: ";
            msg += percentOfParent(d).toFixed(2) + "% of total</div>";
          }
          return msg;
        } else {
          if(d.size){
            msg += " : <div class='treemap_text_details'>$";
            msg += (d.size / 1000000).toFixed(2).replace(/(\d)(?=(\d{3})+\b)/g,'$1,');
            msg += " Billion : ";
            msg += percentOfParent(d).toFixed(2) + "% of total</div>";
          }
          return msg;
        }
      };

      var labelWidth = function(d, context){
        d.w = context.getComputedTextLength();
        if(d.dx > d.w){
          return d.w;
        } else if(d.dx < 6) {
          return 0;
        } else {
          return d.dx - 6;
        }
      };

      // Constancy
      //
      // There can be multiple line items with the same name, some corresponding to
      // discretionary vs mandatory, some with different subfunctions. This is only
      // an issue for the bureau view, so I added a unique column to the csv which
      // is all the different other columns concatenated. If we use this unique
      // name as the constancy key for bureaus, we ensure uniqueness and that all
      // the right boxes will show up.
      var constancyKey = function(d){
        if(Budget.State.levelTracker == "bureau") {
          return d.uniqueName;
        } else {
          return d.name;
        }
      };

      // Data Join
      cell = svg.selectAll("g")
          .data(nodes, function(d) { return constancyKey(d); });

      // Update
      cell.select("rect")
        .transition().duration(2000)
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
          .attr("width", function(d) { return d.dx > 2 ? d.dx - 2 : d.dx; })
          .attr("height", function(d) { return d.dy > 2 ? d.dy - 2 : d.dy; })
          .style("fill", function(d) { return cellColor(d); });

      cell.select(".treemap_text")
        .transition().duration(2000)
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
          .text(function(d) {return tooltipMessage(d);})
          .style("fill-opacity", 0)
          .attr("textLength", function(d){ d.w = this.getComputedTextLength(); return d.dx > d.w ? d.w : d.dx;});

      cell.select(".label")
        .transition().duration(2000)
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
          .text(function(d) {return d.name;})
          .style("opacity", function(d){ d.w = this.getComputedTextLength(); return d.dx > d.w ? 1 : 0; })
          .attr("textLength", function(d){ return labelWidth(d, this); });

      // Enter
      var cellEnter = cell.enter()
        .append("svg:g")
          .attr("class", "bucket")
          .on("click", function(d) {
            that.graphOrUpdate(d.name);
          })
          .on("mouseover", function(){
            tooltip.html($(this).find('.treemap_text').text().replace(/\:/g,"<br/>"));
            return tooltip.style("visibility", "visible");
          })
          .on("mousemove", function(){
            return tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+20)+"px");
          })
          .on("mouseout", function(){return tooltip.style("visibility", "hidden");});

      cellEnter.append("svg:rect")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .transition().duration(2000)
          .attr("class", "cell tooltip")
          .attr("width", function(d) { return d.dx > 2 ? d.dx - 2 : d.dx; })
          .attr("height", function(d) { return d.dy > 2 ? d.dy - 2 : d.dy; })
          .style("fill", function(d) { return cellColor(d); })
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

      cellEnter.append("svg:text")
        .attr("class", "treemap_text")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .attr("dy", ".75em")
        .text(function(d) {return tooltipMessage(d);})
        .style("fill-opacity", 0)
        .style("width", function(d){ return d.dx;})
        .attr("textLength", function(d){ d.w = this.getComputedTextLength(); return d.dx > d.w ? d.w : d.dx;});

      cellEnter.append("svg:text")
        .attr('x', 4)
        .attr('y', 10)
        .attr("class", "label")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .attr("dy", ".75em")
        .text(function(d) {return d.name;})
        .style("fill", "white")
        .style("opacity", function(d){ d.w = this.getComputedTextLength(); return d.dx > d.w ? 1 : 0; })
        .style("width", function(d){ return d.dx;})
        .attr("textLength", function(d){ return labelWidth(d, this); });

      // Exit
      cell.exit()
        .remove();

      // This removes the 100% visualization blocking parent node
      if($('.bucket').length > 1) {
        backgroundBucket = $('.bucket:contains(' + data.name + ')')[0];
        backgroundBucket.remove();
      }
    },

    updateTreemap: function(name, noAdvance){
      this.removeAreaChart();
      var chartData = Budget.State.treemapDataFromState(name, noAdvance);
      this.setupTreemapAndList(chartData);
    },


    graphOrUpdate: function(name){
      var that = this;
      Budget.State.treemapClicks++;
      if(Budget.State.treemapClicks === 1){
        setTimeout(function(){
          if(Budget.State.treemapClicks === 1){
            that.updateAreaChart(name);
          } else {
            that.updateTreemap(name);
          }
          Budget.State.treemapClicks = 0;
        }, 300);
      }
    },

    populateList: function(f){
      var expenseList = $('.expenses');
      expenseList.children().remove();
      var amountUnit = Budget.State.capitaTracker === "per_capita" ? "per person" : "billions";
      var tableHeaders = "<tr><td><strong>Department</strong></td><td><strong>Amount (" + amountUnit + ")</strong></td></tr>";
      expenseList.append(tableHeaders);
      var s = _.sortBy(f, function(n){ return -1 * n.size;});
      _.each(s, function(e){
        var expense = "<tr><td>" + e.name + "</td><td>" + toDollar(e.size) + "</td></tr>";
        expenseList.append(expense);
      });
      var total = totalAmount(f);
      expenseList.append("<tr><td><strong>Total</strong></td><td><strong>" + toDollar(total) + "</strong></td></tr>");
    },

    setTreemapBackgroundToWhite: function(name){
      //$('.bucket:contains(name)')[0].remove();
      // if($('.cell').length > 1){
        //$('.bucket').first().remove();
      // }
    },

    setupTreemapAndList: function(d){
      var oldChart = $(".chartSvgSelect").length ? true : false;
      if(!oldChart){
        this.setupTreemap(d);
      }
      this.updateTreemapData(d);
      this.setTreemapBackgroundToWhite(d.name);
      this.populateList(d.children);
    },

    populateYearlySummary: function(year){
      var expenses = totalAmount(Budget.Expenses.yearlyExpenseSummary(year));
      var receipts = totalAmount(Budget.Receipts.yearlyReceiptsSummary(year));
      var net = receipts - expenses;
      $('.summary_year').html("<strong>"+ Budget.State.yearTracker + " Summary:</strong>");
      $('.summary_expenses').html("Expenses - " + toDollarSummary(expenses));
      $('.summary_receipts').html("Income - " + toDollarSummary(receipts));
      $('.summary_net').html("Net - " + toDollarSummary(net));
    },

    setupAreaChart: function(data){

      var margin = {top: 20, right: 20, bottom: 30, left: 40},
          width = 960 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

      var x = d3.time.scale()
          .range([0, width]);

      var y = d3.scale.linear()
          .range([height, 0]);

      var minAmount = d3.min(data, function(d) {
        if(Budget.State.capitaTracker === "per_capita"){
          return d.amount;
        } else {
          return d.amount/1000000;
        }
      });
      var maxAmount = d3.max(data, function(d) {
        if(Budget.State.capitaTracker === "per_capita"){
          return d.amount;
        } else {
          return d.amount/1000000;
        }
      });

      var xAxis = d3.svg.axis()
          .scale(x);

      var yAxis = d3.svg.axis()
          .scale(y)
          .orient("left");

      var yDomain = function(minimum, maximum){
        if(maximum > 0){
          return [_.min([minimum, 0]), maximum];
        } else {
          return [minimum, 0];
        }
      };

      x.domain(d3.extent(data, function(d) { return d.date; }));
      y.domain(yDomain(minAmount, maxAmount));

      var area = d3.svg.area()
          .x(function(d) { return x(d.date); })
          .y0(function(d){
            if(d.amount < 0) {
              return y(d.amount/1000000);
            } else {
              return y(0);
            }
          })
          .y1(function(d) {
            if(d.amount < 0){
              return y(0);
            } else {
              if(Budget.State.capitaTracker === "per_capita"){
                return y(d.amount);
              } else {
                return y(d.amount/1000000);
              }
            }
          });

      var tooltip = d3.select("#area_graph")
          .append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("z-index", "10000")
          .style("visibility", "hidden")
          .text("a simple tooltip");

      var svg = d3.select("#area_graph").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


      svg.append("path")
          .datum(data)
          .attr("class", "area")
          .attr("d", area)
          .text('simple');

      svg.selectAll("area")
          .data(data)
        .enter().append("svg:rect")
          .attr("x", function(d){ return x(d.date); })
          .attr("y", 0)
          .attr("height", height)
          .attr("width", "30px")
          .style("opacity", "0")
          .attr("text", function(d){
            var msg = d.date.getFullYear().toString();
            if(d.amount){
              msg += " - $";
              if(Budget.State.capitaTracker === "per_capita"){
                msg += (d.amount).toFixed(2).replace(/(\d)(?=(\d{3})+\b)/g,'$1,');
                msg += " Per Person";
              } else {
                msg += (d.amount/1000000).toFixed(2).replace(/(\d)(?=(\d{3})+\b)/g,'$1,');
                msg += " Billion";
              }
            }
            return msg;
          })
          .on("mouseover", function(){
            tooltip.html(this.getAttribute("text"));
            return tooltip.style("visibility", "visible");
          })
          .on("mousemove", function(){
            var top = d3.event.pageY - parseInt($('#facebox').css('top'), 10);
            var left = d3.event.pageX - parseInt($('#facebox').css('left'), 10);
            return tooltip.style("top", (top -20)+"px").style("left",(left + 20)+"px");
          })
          .on("mouseout", function(){return tooltip.style("visibility", "hidden");});

      var xAxisTransform = minAmount < 0 ? y(0) : height;
      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + xAxisTransform + ")")
          .call(xAxis);

      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
          .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text(function(){
            if(Budget.State.capitaTracker === "per_capita"){
              return "Per Person ($)";
            } else { 
              return "Billions ($)";
            }
          });
    },

    updateAreaChart: function(name){
      this.removeAreaChart();
      this.loadAreaLightbox(name);
      var chartData = Budget.State.areaGraphData(name);
      this.setupAreaChart(chartData);
    },

    loadAreaLightbox: function(name){
      jQuery.facebox(
        '<div id="area_graph" style="width: 970; height: 550;">' +
          '<h2 class="chart_title">' + name + '</h2>' +
        '</div>'
      );
    },

    removeAreaChart: function(){
      $('#area_graph').remove();
    },

    showChartControl: function(){
      $('.summary').show();
      $('.chart_control').show();
      $('#chart').show();
      $('.toggle_section').show();
      $('.backtrace').show();
      $('.mailing_list').show();
      $('.sources').show();
    },

    removeChart: function(){
      $('.chart').remove();
      $('.treemapTooltip').remove();
    }
  };

  var toDollar = function(d){
    if(Budget.State.capitaTracker === "per_capita"){
      return "$" + (d).toFixed(2).replace(/(\d)(?=(\d{3})+\b)/g,'$1,');
    } else {
      return "$" + (d/1000000).toFixed(2).replace(/(\d)(?=(\d{3})+\b)/g,'$1,');
    }
  };

  var toDollarSummary = function(d){
    return "$" + (d/1000000).toFixed(0).replace(/(\d)(?=(\d{3})+\b)/g,'$1,') + " Billion";
  };

  var totalAmount = function(f){
    return _.reduce(f, function(total, expense){
      return total + expense.size;
    },0);
  };

  Budget.Init.setup();

  // Set up facebox settings
  $.facebox.settings.closeImage = 'public/closelabel.png';
  $.facebox.settings.loadingImage = 'public/loading.gif';

  // Attach event listeners to the years
  $('.year').on("click", function(){
    if(typeof expenseLineItems === "undefined"){
      var clickedYear = $(this).text();
      var that = $(this);
      $(this).html("loading");
      setTimeout(function(){
       that.html(clickedYear);
      },5000);
    } else {
      $(this).addClass('active').siblings().removeClass('active');
      // Budget.Display.removeChart();
      Budget.Display.showChartControl();
      Budget.State.yearTracker = $(this).text();
      Budget.Display.populateYearlySummary(Budget.State.yearTracker);
      if(Budget.State.atBudgetLevel()){
        Budget.Display.updateTreemap();
      } else {
        var treemapName = Budget.State.lastItem;
        Budget.Display.updateTreemap(treemapName, true);
      }
    }
  });

  $('.type_chooser li').on("click", function(){
    $(this).addClass('active').siblings().removeClass('active');
    var type = this.textContent.toLowerCase() == 'expenses' ? 'expenses' : 'receipts';
    Budget.State.typeTracker = type;
    Budget.Display.updateTreemap();
  });

  $('.inflation_chooser li').on("click", function(){
    $(this).addClass('active').siblings().removeClass('active');
    if (this.textContent === "Inflation Adjusted") {
      Budget.State.moneyTracker = "inflation";
    } else if(this.textContent === "Plain Dollars"){
      Budget.State.moneyTracker = "normal";
    }
    if(Budget.State.atBudgetLevel()){
      Budget.Display.updateTreemap();
    } else {
      var treemapName = Budget.State.lastItem;
      Budget.Display.updateTreemap(treemapName, true);
    }
  });


  $('.capita_chooser_list li').on("click", function(){
    $(this).addClass('active').siblings().removeClass('active');
    if (this.textContent === "Total") {
      Budget.State.capitaTracker = "total";
    } else if(this.textContent === "Per Capita"){
      Budget.State.capitaTracker = "per_capita";
    }
    if(Budget.State.atBudgetLevel()){
      Budget.Display.updateTreemap();
    } else {
      var treemapName = Budget.State.lastItem;
      Budget.Display.updateTreemap(treemapName, true);
    }
  });

  $(document).on("click", ".expense_table tr", function(e) {
    Budget.Display.graphOrUpdate(this.firstChild.textContent);
  });

  // $(document).on("click", ".toggle_list", function(){
  //   $('.expense_table').toggle();
  // });

  $(document).on("click", ".show_instructions", function(){
    Budget.Display.showInstructions();
  });


  $('.toggle_list').on("click", function(){
    $('.expense_table').toggle();
  });

  $('.show_list').on("click", function(){
    $('.show_list').hide();
    $('.hide_list').show();
    $('.expense_table').show();
  });

  $('.hide_list').on("click", function(){
    $('.hide_list').hide();
    $('.expense_table').hide();
    $('.show_list').show();
  });

});
