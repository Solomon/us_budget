//$(document).ready(function(){

  yearTracker = '2010';

  var loadExpenseLineItems = function(){
    var items = []
    d3.csv('/us_budget_expenses_2013.csv', function(csv){
      $.each(csv, function(row, data){
        items.push(data);
      });
    });
    return items;
  };

  var loadIncomeLineItems = function(){
    var items = []
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

    getLineItem: function(item){
      return {"agency_name" : item['Agency Name'],
              "bureau_name" : item['Bureau Name'],
              "name" : item['Account Name']};
    },

    getYearlyLineItem: function(item, year){
      var lineItemCost = this.getLineItem(item);
      lineItemCost.size = parseInt(item[year].replace(',',''));
      return lineItemCost;
    },

    getHistoricalLineItem: function(agencyName, bureauName, accountName){
      var historical = [];
      var row = _.findWhere(
        expenseLineItems,
        { 'Agency Name' : agencyName, 'Bureau Name' : bureauName, 'Account Name' : accountName}
      );
      var years = _.range(1980, 2013);
      _.each(years, function(y){
        var amount = row[y].replace(',','');
        var year = '1/1/' + y;
        var period = new Date(year);
        console.log(period);
        historical.push({"date" : period, "amount" : amount});
      });
      return historical;
    },

    getYearlyExpenses: function(year){
      var expenses = this;
      var yearly_budget = expenseLineItems.map(
        function(x) { return expenses.getYearlyLineItem(x, year)}
      );

      var noZeroSize = _.filter(yearly_budget, function(x){ return x.size > 0;});
      //return noZeroSize;
      return yearly_budget;
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
        .key(function(d) {return d['agency_name'];})
        .key(function(d) {return d['bureau_name'];})
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
        "children" : _.map(w.children, function(n){return _.pick(n, 'name', 'size')})
      };
    },

    getYearlyBureau: function(year, agency, bureau){
      levelTracker = "bureau";
      bureauTracker = bureau;
      var d = this.getYearlyData(year);
      var a = _.where(d.children, { "name" : agency })[0];
      return _.where(a.children, { "name" : bureau})[0];
    },
  };


// http://bost.ocks.org/mike/treemap/
  var setupVisual = function(visualData){
    var w = 940,
        h = 600,
        x = d3.scale.linear().range([0, w]),
        y = d3.scale.linear().range([0, h]),
        color = d3.scale.category20c(),
        root,
        node;

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
          $('.chart').remove();
          if(levelTracker === "budget"){
            $('.agency').html(d.name);
            var chartData = Budget.Expenses.getYearlyAgency(yearTracker, d.name);
          } else if(levelTracker === "agency"){
            $('.bureau').html(d.name);
            var chartData = Budget.Expenses.getYearlyBureau(yearTracker, agencyTracker, d.name);
          } else {
            $('.agency').html('');
            $('.bureau').html('');
            var chartData = Budget.Expenses.getTopLevelAgencies(yearTracker);
          }
          setupChartAndList(chartData);
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


  };

  var toDollar = function(d){
    return "$" + d.toFixed(0).replace(/(\d)(?=(\d{3})+\b)/g,'$1,');
  };

  var setupChartAndList = function(d){
    setupVisual(d);
    populateExpenseList(d.children);
  };

  var populateExpenseList = function(f){
    var expenseList = $('.expenses');
    expenseList.children().remove();
    var s = _.sortBy(f, function(n){ return -1 * n.size;});
    _.each(s, function(e){
      var expense = "<tr><td>" + e.name + "</td><td>" + toDollar(e.size) + "</td></tr>";
      expenseList.append(expense);
    });
    var total = _.reduce(f, function(total, expense){return total + expense.size;},0);
    expenseList.append("<tr><td>Total</td><td>" + toDollar(total) + "</td></tr>");
  };


  $('.year').on("click", function(){
    $('.chart').remove();
    yearTracker = this.childNodes[0].textContent;
    var d = Budget.Expenses.getTopLevelAgencies(yearTracker);
    setupChartAndList(d);
  });
//});
