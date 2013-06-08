$(document).ready(function(){

  Budget = {};

  Budget.Init = {

    /*
    * Initialize everything the app needs
    * Load the expense and income line item global variables
    */
    setup: function(){
      yearTracker = '2010';
      inflationTracker = false;
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
      d3.csv('/us_budget_expenses_2013.csv', function(csv){
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
      d3.csv('/us_budget_revenues_2013.csv', function(csv){
        $.each(csv, function(row, data){
          items.push(data);
        });
        incomeLineItems = items;
        inflationIncomeItems = that.adjustForInflation(items);
      });
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
      var expenseItems = inflationTracker ? inflationExpenseItems : expenseLineItems;
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

    getYearlyExpenses: function(year){
      var expenses = this;
      var expenseItems = inflationTracker ? inflationExpenseItems : expenseLineItems;
      var yearlyBudget = expenseItems.map(
        function(x) { return expenses.getYearlyLineItem(x, year); }
      );
      return yearlyBudget;
    },

    getYearlyData: function(year){
      var d = this.getNestedData(year);
      var expenses = this;

      var data = _.map(d, function(val , key){
        var agencyChildren = expenses.getAgencyChildren(val);
        return {
          "name" : key,
          "children" : agencyChildren,
          "size" : _.reduce(agencyChildren, function(sum, num){
          return sum + num.size;},0)
        };
      });

      var sortedData = _.sortBy(data, function(d){return -1 * d.size; });

      return {"name" : "us_budget", "children" : sortedData};
    },

    getTopLevelAgencies: function(year){
      yearTracker = year;
      levelTracker = "budget";
      var expenses = this;
      var d = this.getNestedData(year);

      var data = _.map(d, function(val , key){
        var agencyChildren = expenses.getAgencyChildren(val);
        return {
          "name" : key,
          "size" : _.reduce(agencyChildren, function(sum, num){
          return sum + num.size;},0)
        };
      });

      var sortedData = _.sortBy(data, function(d){return -1 * d.size; });

      return {"name" : "us_budget", "children" : sortedData};
    },

    getNestedData: function(year){
      var data2 = d3.nest()
        .key(function(d) {return d['agencyName'];})
        .key(function(d) {return d['bureauName'];})
        .map(this.getYearlyExpenses(year));
      return data2;
    },

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
      levelTracker = "agency";
      agencyTracker = agency;
      var d = this.getYearlyData(year);
      var w = _.where(d.children, { "name" : agency })[0];
      return {
        "name" : agency,
        "children" : _.map(w.children, function(n){return _.pick(n, 'name', 'size');})
      };
    },

    getYearlyBureau: function(year, agency, bureau){
      levelTracker = "bureau";
      bureauTracker = bureau;
      var d = this.getYearlyData(year);
      var a = _.where(d.children, { "name" : agency })[0];
      return _.where(a.children, { "name" : bureau})[0];
    }
  };

  Budget.Receipts = {
    getHistorical: function(agencyName, bureauName, accountName){
      var historical = [];
      var incomeItems = inflationTracker ? inflationIncomeItems : incomeLineItems;
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
      var receipts = this;
      var incomeItems = inflationTracker ? inflationIncomeItems : incomeLineItems;
      return incomeItems.map(
        function(x) { return receipts.receiptForYear(x,year); }
      );
    },

    receiptsData: function(year){
      var d = this.nestedReceipts(year);
      var receipts = this;

      var data = _.map(d, function(val , key){
        var agencyChildren = receipts.agencyChildren(val);
        return {
          "name" : key,
          "children" : agencyChildren,
          "size" : _.reduce(agencyChildren, function(sum, num){
          return sum + num.size;},0)
        };
      });

      var sortedData = _.sortBy(data, function(d){return -1 * d.size; });

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
      yearTracker = year;
      levelTracker = "budget";
      var receipts = this;
      var d = this.nestedReceipts(year);

      var data = _.map(d, function(val , key){
        var agencyChildren = receipts.agencyChildren(val);
        return {
          "name" : key,
          "size" : _.reduce(agencyChildren, function(sum, num){
          return sum + num.size;},0)
        };
      });

      var sortedData = _.sortBy(data, function(d){return -1 * d.size; });

      return {"name" : "us_budget", "children" : sortedData};
    },

    agencyReceipts: function(year, agency){
      levelTracker = "agency";
      agencyTracker = agency;
      var d = this.receiptsData(year);
      var w = _.where(d.children, { "name" : agency })[0];
      return {
        "name" : agency,
        "children" : _.map(w.children, function(n){return _.pick(n, 'name', 'size');})
      };
    },

    bureauReceipts: function(year, agency, bureau){
      levelTracker = "bureau";
      bureauTracker = bureau;
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
    setupTreemap: function(visualData){
      var w = 940,
          h = 600,
          x = d3.scale.linear().range([0, w]),
          y = d3.scale.linear().range([0, h]),
          color = d3.scale.category20c(),
          root,
          chartData,
          node,
          visual = this;

      var tooltip = d3.select("#chart")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .text("a simple tooltip");

      var treemap = d3.layout.treemap()
          .round(false)
          .size([w, h])
          .sticky(true)
          .value(function(d) { return d.size; });

      var svg = d3.select("#chart").append("div")
          .attr("class", "chart")
          .style("width", w + "px")
          .style("height", h + "px")
        .append("svg:svg")
          .attr("width", w)
          .attr("height", h)
        .append("svg:g")
          .attr("transform", "translate(.5,.5)");

      var nodes = treemap.nodes(visualData);

      var cell = svg.selectAll("g")
          .data(nodes)
        .enter().append("svg:g")
          .attr("class", "cell tooltip")
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
          .on("click", function(d) {
            visual.updateTreemap(d.name);
          })
          .on("mouseover", function(){
            tooltip.html($(this).text().replace(":","<br/>"));
            return tooltip.style("visibility", "visible");
          })
          .on("mousemove", function(){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+20)+"px");})
          .on("mouseout", function(){return tooltip.style("visibility", "hidden");});

      cell.append("svg:rect")
          .attr("width", function(d) { return d.dx ; })
          .attr("height", function(d) { return d.dy ; })
          .style("fill", function(d) { return color(d.size * Math.random()); });

      cell.append("svg:text")
          .attr("x", function(d) { return d.dx / 2; })
          .attr("y", function(d) { return d.dy / 2; })
          .attr("dy", ".35em")
          .attr("text-anchor", "middle")
          .text(function(d) {
            var msg = d.name;
            if(d.size){
              msg += " : $";
              msg += d.size.toFixed(0).replace(/(\d)(?=(\d{3})+\b)/g,'$1,');
            }
            return msg;
          })
          .style("visibility", "hidden");

      // cell.append("svg:title")
      //     .text(function(d) {
      //       var msg = d.name;
      //       if(d.size){
      //         msg += " : ";
      //         msg += toDollar(d.size);
      //       }
      //       return msg;
      //     });

      var size = function(d){return d.size;};


    },

    updateTreemap: function(name){
      // $('.chart').remove();
      this.removeChart();

      var resetChart = function(){
        $('.agency').html('');
        $('.bureau').html('');
        if(typeof typeTracker === 'undefined' || typeTracker === 'expenses'){
          typeTracker = 'expenses';
          chartData = Budget.Expenses.getTopLevelAgencies(yearTracker);
        } else {
          chartData = Budget.Receipts.budgetReceipts(yearTracker);
        }
      };

      if(typeof levelTracker === "undefined" || typeof name === "undefined"){
        resetChart();
      } else if(typeTracker === "expenses"){
        if(levelTracker === "budget"){
          $('.agency').html(name);
          chartData = Budget.Expenses.getYearlyAgency(yearTracker, name);
        } else if(levelTracker === "agency"){
          $('.bureau').html(name);
          chartData = Budget.Expenses.getYearlyBureau(yearTracker, agencyTracker, name);
        } else {
          resetChart();
        }
      } else if(typeTracker === "receipts"){
        if(levelTracker === "budget"){
          $('.agency').html(name);
          chartData = Budget.Receipts.agencyReceipts(yearTracker, name);
        } else if(levelTracker === "agency"){
          $('.bureau').html(name);
          chartData = Budget.Receipts.bureauReceipts(yearTracker, agencyTracker, name);
        } else {
          resetChart();
        }
      }
      this.setupTreemapAndList(chartData);
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

    setupTreemapAndList: function(d){
      this.setupTreemap(d);
      this.populateList(d.children);
    },

    populateYearlySummary: function(year){
      var expenses = totalAmount(Budget.Expenses.getYearlyExpenses(year));
      var receipts = totalAmount(Budget.Receipts.yearlyReceipts(year));
      var net = receipts - expenses;
      $('.summary_expenses').html("Expenses " + toDollar(expenses));
      $('.summary_receipts').html("Receipts " + toDollar(receipts));
      $('.summary_net').html("Net " + toDollar(net));
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
          .orient("bottom");

      var yAxis = d3.svg.axis()
          .scale(y)
          .orient("left");

      var area = d3.svg.area()
          .x(function(d) { return x(d.date); })
          .y0(height)
          .y1(function(d) { return y(d.amount); });

      var tooltip = d3.select("#area_graph")
          .append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("z-index", "10")
          .style("visibility", "hidden")
          .text("a simple tooltip");

      var svg = d3.select("#area_graph").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      x.domain(d3.extent(data, function(d) { return d.date; }));
      y.domain([0, d3.max(data, function(d) { return d.amount; })]);

      svg.append("path")
          .datum(data)
          .attr("class", "area")
          .attr("d", area)
          .text('simple');

      svg.selectAll("area")
          .data(data)
        .enter().append("circle")
          .attr("r", 4)
          .attr("cx", function(d) { return x(d.date); })
          .attr("cy", function(d) { return y(d.amount); })
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
          .on("mousemove", function(){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+20)+"px");})
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

    updateAreaChart: function(i){
      $('#area_graph svg').remove();

      if(typeTracker === "receipts") {
        if(levelTracker === "budget") {
          this.setupAreaChart(Budget.Receipts.getHistorical(i));
        } else if(levelTracker === "agency") {
          this.setupAreaChart(Budget.Receipts.getHistorical(agencyTracker, i));
        } else {
          this.setupAreaChart(Budget.Receipts.getHistorical(agencyTracker, bureauTracker, i));
        }
      } else {
        if(levelTracker === "budget") {
          this.setupAreaChart(Budget.Expenses.getHistorical(i));
        } else if(levelTracker === "agency") {
          this.setupAreaChart(Budget.Expenses.getHistorical(agencyTracker, i));
        } else {
          this.setupAreaChart(Budget.Expenses.getHistorical(agencyTracker, bureauTracker, i));
        }
      }
    },

    removeChart: function(){
      $('.chart').remove();
      $('.tooltip').remove();
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

  $('.year').on("click", function(){
    // $('.chart').remove();
    Budget.Display.removeChart();
    yearTracker = this.childNodes[0].textContent;
    Budget.Display.populateYearlySummary(yearTracker);
    Budget.Display.updateTreemap();
  });

  $('.type_chooser ul li').on("click", function(){
    $(this).addClass('active').siblings().removeClass('active');

    // $('.chart').remove();
    Budget.Display.removeChart();
    typeTracker = this.textContent.toLowerCase();
    Budget.Display.updateTreemap();
  });

  $('.inflation_chooser li').on("click", function(){
    $(this).addClass('active').siblings().removeClass('active');
    if (this.textContent === "Inflation Adjusted") {
      inflationTracker = true;
    } else {
      inflationTracker = false;
    }
    Budget.Display.updateTreemap();
  });

  var table_row_clicks = 0;
  $(document).on("click", ".expense_table tr", function(e) {
    var that = this;
    table_row_clicks++;
    if(table_row_clicks === 1){
      setTimeout(function(){
        if(table_row_clicks === 1){
          Budget.Display.updateAreaChart(that.firstChild.textContent);
        } else {
          Budget.Display.updateTreemap(that.firstChild.textContent);
        }
        table_row_clicks = 0;
      }, 300);
    }
  });
});