//$(document).ready(function(){

  yearTracker = '2010';

  var loadExpenseLineItems = function(){
    var items = [];
    d3.csv('/us_budget_expenses_2013.csv', function(csv){
      $.each(csv, function(row, data){
        items.push(data);
      });
    });
    return items;
  };

  var loadIncomeLineItems = function(){
    var items = [];
    d3.csv('/us_budget_revenues_2013.csv', function(csv){
      $.each(csv, function(row, data){
        items.push(data);
      });
    });
    return items;
  };



  expenseLineItems = loadExpenseLineItems();
  incomeLineItems = loadIncomeLineItems();

  Budget = {};

  Budget = Budget || {};

  Budget.Expenses = {

    expenseOrigin: function(item){
      return {"agencyName" : item['Agency Name'],
              "bureauName" : item['Bureau Name'],
              "name" : item['Account Name']};
    },

    getYearlyLineItem: function(item, year){
      var lineItem = this.expenseOrigin(item);
      lineItem.size = parseInt(item[year].replace(/\,/g,''),10);
      return lineItem;
    },

    getHistoricalLineItem: function(agencyName, bureauName, accountName){
      var historical = [];
      var row = _.findWhere(
        expenseLineItems,
        { 'Agency Name' : agencyName, 'Bureau Name' : bureauName, 'Account Name' : accountName}
      );
      var rows = _.filter(expenseLineItems, function(r){
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
      var yearlyBudget = expenseLineItems.map(
        function(x) { return expenses.getYearlyLineItem(x, year); }
      );

      var noZeroSize = _.filter(yearlyBudget, function(x){ return x.size > 0;});
      //return noZeroSize;
      return yearlyBudget;
    },

    filterZeroSize: function(nestedData){

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
      return incomeLineItems.map(
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
    setupVisual: function(visualData){
      var w = 940,
          h = 600,
          x = d3.scale.linear().range([0, w]),
          y = d3.scale.linear().range([0, h]),
          color = d3.scale.category20c(),
          root,
          chartData,
          node,
          visual = this;

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
            visual.updateChart(d);
          });

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
          .style("opacity", function(d) { d.w = this.getComputedTextLength(); return d.dx > d.w ? 1 : 0; });

      cell.append("svg:title")
          .text(function(d) {
            var msg = d.name;
            if(d.size){
              msg += " : ";
              msg += toDollar(d.size);
            }
            return msg;
          });

      var size = function(d){return d.size;};


    },

    updateChart: function(d){
      $('.chart').remove();

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

      if(typeof levelTracker === "undefined" || typeof d === "undefined"){
        resetChart();
      } else if(typeTracker === "expenses"){
        if(levelTracker === "budget"){
          $('.agency').html(d.name);
          chartData = Budget.Expenses.getYearlyAgency(yearTracker, d.name);
        } else if(levelTracker === "agency"){
          $('.bureau').html(d.name);
          chartData = Budget.Expenses.getYearlyBureau(yearTracker, agencyTracker, d.name);
        } else {
          resetChart();
        }
      } else if(typeTracker === "receipts"){
        if(levelTracker === "budget"){
          $('.agency').html(d.name);
          chartData = Budget.Receipts.agencyReceipts(yearTracker, d.name);
        } else if(levelTracker === "agency"){
          $('.bureau').html(d.name);
          chartData = Budget.Receipts.bureauReceipts(yearTracker, agencyTracker, d.name);
        } else {
          resetChart();
        }
      }
      this.setupChartAndList(chartData);
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

    setupChartAndList: function(d){
      this.setupVisual(d);
      this.populateList(d.children);
    },

    populateYearlySummary: function(year){
      var expenses = totalAmount(Budget.Expenses.getYearlyExpenses(year));
      var receipts = totalAmount(Budget.Receipts.yearlyReceipts(year));
      var net = receipts - expenses;
      $('.summary_expenses').html("Expenses " + toDollar(expenses));
      $('.summary_receipts').html("Receipts " + toDollar(receipts));
      $('.summary_net').html("Net " + toDollar(net));
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



  $('.year').on("click", function(){
    $('.chart').remove();
    yearTracker = this.childNodes[0].textContent;
    Budget.Display.populateYearlySummary(yearTracker);
    Budget.Display.updateChart();
  });

  $('.type_chooser ul li').on("click", function(){
    $('.chart').remove();
    typeTracker = this.textContent.toLowerCase();
    Budget.Display.updateChart();
  });
//});
