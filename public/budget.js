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
    * Base currently year is 1980
    */
    adjustForInflation: function(lineItems){
      var inflation = [];
      var inflationDivisor = {
        '1980': '1', '1981': '1.03', '1982': '1.061', '1983': '1.093', '1984': '1.126', '1985': '1.159', '1986': '1.194', '1987': '1.23', '1988': '1.267', '1989': '1.305', '1990': '1.344', '1991': '1.384', '1992': '1.426', '1993': '1.469', '1994': '1.513', '1995': '1.558', '1996': '1.605', '1997': '1.653', '1998': '1.702', '1999': '1.754', '2000': '1.806', '2001': '1.86', '2002': '1.916', '2003': '1.974', '2004': '2.033', '2005': '2.094', '2006': '2.157', '2007': '2.221', '2008': '2.288', '2009': '2.357', '2010': '2.427', '2011': '2.5', '2012': '2.575', '2013': '2.652', '2014': '2.652', '2015': '2.652', '2016': '2.652', '2017': '2.652'
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
    inflationTracker: false,
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
      return {"agencyName" : item['Agency Name'],
              "bureauName" : item['Bureau Name'],
              "name" : item['Account Name']};
    },

    /*
    * Takes a single line item and year, and returns the data necessary for the treemap
    * Namely: the agencyName, Bureau Name, Account Name, and amount for the year
    */
    getYearlyLineItem: function(item, year){
      var lineItem = this.expenseOrigin(item);
      lineItem.size = parseInt(item[year].replace(/\,/g,''),10);
      return lineItem;
    },

    /*
    * Gets the historical amounts for a set of line items for use in the area chart
    * takes required agencyName, but bureauName and accountName are optional
    * Returns an array of objects with dates and amounts, which can be graphed
    * If you pass agencyName = "Department of Agriculture", it will return the total sum
    * of all dept of agriculture expenses between 1980 and 2012 each year
    */
    getHistorical: function(agencyName, bureauName, accountName){
      var historical = [];
      var expenseItems = Budget.State.inflationTracker ? inflationExpenseItems : expenseLineItems;
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
      var years = _.range(1980, 2013);
      _.each(years, function(y){
        var amount = _.reduce(rows,function(sum, r){
          return sum + parseInt(r[y].replace(/\,/g,''), 10);
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
      var expenseItems = Budget.State.inflationTracker ? inflationExpenseItems : expenseLineItems;
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
        .key(function(d) {return d['agencyName'];})
        .key(function(d) {return d['bureauName'];})
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
      var incomeItems = Budget.State.inflationTracker ? inflationIncomeItems : incomeLineItems;
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
      var years = _.range(1980, 2013);
      _.each(years, function(y){
        var amount = _.reduce(rows,function(sum, r){
          return sum + parseInt(r[y].replace(/\,/g,''), 10);
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
      receiptItem.size = parseInt(receipt[year].replace(/\,/g,''), 10);
      return receiptItem;
    },

    yearlyReceipts: function(year){
      var that = this;
      var incomeItems = Budget.State.inflationTracker ? inflationIncomeItems : incomeLineItems;
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
      var w = 940,
          h = 500,
          x = d3.scale.linear().range([0, w]),
          y = d3.scale.linear().range([0, h]),
          root,
          chartData,
          node,
          that = this;

      color = d3.scale.category20c();

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

      // Data Join
      cell = svg.selectAll("g")
          .data(nodes);

      // Update
      cell.select("rect").
        transition().duration(2000)
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
          .attr("width", function(d) { return d.dx > 2 ? d.dx - 2 : d.dx; })
          .attr("height", function(d) { return d.dy > 2 ? d.dy - 2 : d.dy; })
          .style("fill", function(d) { return color(d.size * Math.random()); });

      cell.select(".treemap_text")
        .text(function(d) {
          var msg = d.name;
          if(d.size){
            msg += " : <div class='treemap_text_details'>$";
            msg += (d.size / 1000000).toFixed(2).replace(/(\d)(?=(\d{3})+\b)/g,'$1,');
            msg += " Billion : ";
            msg += ((d.size/d.parent.value) * 100).toFixed(2) + "% of total</div>";
          }
          return msg;
        })
        .style("fill-opacity", 0)
        .attr("textLength", function(d){ d.w = this.getComputedTextLength(); return d.dx > d.w ? d.w : d.dx;});

      cell.select(".label")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .text(function(d) {return d.name;})
        .style("opacity", function(d){ d.w = this.getComputedTextLength(); return d.dx > d.w ? 1 : 0; })
        .attr("textLength", function(d){
          d.w = this.getComputedTextLength();
          if(d.dx > d.w){
            return d.w;
          } else if(d.dx < 6) {
            return 0;
          } else {
            return d.dx - 6;
          }
        });

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
          .on("mousemove", function(){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+20)+"px");})
          .on("mouseout", function(){return tooltip.style("visibility", "hidden");});

      cellEnter.append("svg:rect")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .transition().duration(2000)
          .attr("class", "cell tooltip")
          .attr("width", function(d) { return d.dx > 2 ? d.dx - 2 : d.dx; })
          .attr("height", function(d) { return d.dy > 2 ? d.dy - 2 : d.dy; })
          .style("fill", function(d) { return color(d.size * Math.random()); })
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

      cellEnter.append("svg:text")
        .attr("class", "treemap_text")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .attr("dy", ".75em")
        .text(function(d) {
          var msg = d.name;
          if(d.size){
            msg += " : <div class='treemap_text_details'>$";
            msg += (d.size / 1000000).toFixed(2).replace(/(\d)(?=(\d{3})+\b)/g,'$1,');
            msg += " Billion : ";
            msg += ((d.size/d.parent.value) * 100).toFixed(2) + "% of total</div>";
          }
          return msg;
        })
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
        .attr("textLength", function(d){
          d.w = this.getComputedTextLength();
          if(d.dx > d.w){
            return d.w;
          } else if(d.dx < 6) {
            return 0;
          } else {
            return d.dx - 6;
          }
        });

      // Exit
      cell.exit()
        .remove();

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
      var s = _.sortBy(f, function(n){ return -1 * n.size;});
      _.each(s, function(e){
        var expense = "<tr><td>" + e.name + "</td><td>" + toDollar(e.size) + "</td></tr>";
        expenseList.append(expense);
      });
      var total = totalAmount(f);
      expenseList.append("<tr><td>Total</td><td>" + toDollar(total) + "</td></tr>");
    },

    setTreemapBackgroundToWhite: function(){
      // if($('.cell').length > 1){
        $('.bucket').first().remove();
      // }
    },

    setupTreemapAndList: function(d){
      var oldChart = $(".chartSvgSelect").length ? true : false;
      if(!oldChart){
        this.setupTreemap(d);
      }
      this.updateTreemapData(d);
      this.setTreemapBackgroundToWhite();
      this.populateList(d.children);
    },

    populateYearlySummary: function(year){
      var expenses = totalAmount(Budget.Expenses.getYearlyExpenses(year));
      var receipts = totalAmount(Budget.Receipts.yearlyReceipts(year));
      var net = receipts - expenses;
      $('.summary_year').html(Budget.State.yearTracker + " Summary:");
      $('.summary_expenses').html("Expenses - " + toDollar(expenses));
      $('.summary_receipts').html("Receipts - " + toDollar(receipts));
      $('.summary_net').html("Net - " + toDollar(net));
    },

    setupAreaChart: function(data){

      var margin = {top: 20, right: 20, bottom: 30, left: 100},
          width = 960 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

      var x = d3.time.scale()
          .range([0, width]);

      var y = d3.scale.linear()
          .range([height, 0]);

      var xAxis = d3.svg.axis()
          .scale(x)
          .orient(y(0));

      var yAxis = d3.svg.axis()
          .scale(y)
          .orient("left");

      var minAmount = d3.min(data, function(d) { return d.amount; });

      var area = d3.svg.area()
          .x(function(d) { return x(d.date); })
          .y0(height)
          .y1(function(d) { return y(d.amount); });

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

      x.domain(d3.extent(data, function(d) { return d.date; }));
      y.domain(
        [
          _.min([ minAmount ,0 ]),
          d3.max(data, function(d) { return d.amount; })
        ]
      );

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
              msg += d.amount.toFixed(0).replace(/(\d)(?=(\d{3})+\b)/g,'$1,');
            }
            return msg;
          })
          .on("mouseover", function(){
            tooltip.html(this.getAttribute("text"));
            return tooltip.style("visibility", "visible");
          })
          .on("mousemove", function(){
            var top = event.pageY - parseInt($('#facebox').css('top'), 10);
            var left = event.pageX - parseInt($('#facebox').css('left'), 10);
            return tooltip.style("top", (top -20)+"px").style("left",(left + 20)+"px");
          })
          .on("mouseout", function(){return tooltip.style("visibility", "hidden");});

      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
          .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text("Thousands ($)");
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
      $('.instructions').hide();
      $('.show_instructions').show();
      $('.summary').show();
      $('.chart_control').show();
      $('#chart').show();
      $('.toggle_section').show();
      $('.backtrace').show();
    },

    showInstructions: function(){
      $('.summary').hide();
      $('.show_instructions').hide();
      $('.chart_control').hide();
      $('#chart').hide();
      $('.toggle_section').hide();
      $('.expense_table').hide();
      $('.backtrace').hide();
      $('.instructions').show();
    },

    removeChart: function(){
      $('.chart').remove();
      $('.treemapTooltip').remove();
    }
  };

  var toDollar = function(d){
    return "$" + d.toFixed(0).replace(/(\d)(?=(\d{3})+\b)/g,'$1,');
  };


  var totalAmount = function(f){
    return _.reduce(f, function(total, expense){
      return total + expense.size;
    },0);
  };

  Budget.Init.setup();

  // Set up facebox settings
  $.facebox.settings.closeImage = '/closelabel.png';
  $.facebox.settings.loadingImage = '/loading.gif';

  // Attach event listeners to the years
  $('.year').on("click", function(){
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
  });

  $('.type_chooser li').on("click", function(){
    $(this).addClass('active').siblings().removeClass('active');
    Budget.State.typeTracker = this.textContent.toLowerCase();
    Budget.Display.updateTreemap();
  });

  $('.inflation_chooser li').on("click", function(){
    $(this).addClass('active').siblings().removeClass('active');
    if (this.textContent === "Inflation Adjusted") {
      Budget.State.inflationTracker = true;
    } else {
      Budget.State.inflationTracker = false;
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