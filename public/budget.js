//$(document).ready(function(){
  var w = 1280 - 80,
      h = 800 - 180,
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

  var svg = d3.select("body").append("div")
      .attr("class", "chart")
      .style("width", w + "px")
      .style("height", h + "px")
    .append("svg:svg")
      .attr("width", w)
      .attr("height", h)
    .append("svg:g")
      .attr("transform", "translate(.5,.5)");



  line_items = []
  d3.csv('/us_budget_expenses_2013.csv', function(csv){
    $.each(csv, function(row, data){
      line_items.push(data);
    });

    node = root = csv;
    getYearlyInfo('2010');
  });

  var getYearlyInfo = function(year) {

    var agencyName = d3.nest()
      .key(function(d) {return d['Agency Name'];})
      .rollup(function(leaves) { return {
        "length" :leaves.length,
        "size" : d3.sum(leaves, function(d){return parseInt(d[year]);}),
        "children" : leaves } })
      .map(node);

    var bureauName = d3.nest()
      .key(function(d) {return d['Agency Name'];})
      .key(function(d) {return d['Bureau Name'];})
        .rollup(function(leaves) { return {
          "length" :leaves.length,
          "size" : d3.sum(leaves, function(d){return parseInt(d[year]);}),
          "children" : leaves } })
      .map(node);


    var nodes = treemap.nodes(root);

    var cell = svg.selectAll("g")
      .data(nodes)
      .enter().append("svg:g")

    cell.append("svg:rect")
      .attr("x", Math.random() * 1000)
      .attr("y", Math.random() * 600)

    return bureauName;
  };


  var getField = function(item, field){
    return item[field];
  };

  var getLineItem = function(item){
    return {"agency_name" : item['Agency Name'],
            "bureau_name" : item['Bureau Name'],
            "name" : item['Account Name']};
  };

  var getYearlyLineItem = function(item, year){
    var line_item_cost = getLineItem(item);
    line_item_cost.size = parseInt(item[year].replace(',',''));
    return line_item_cost;
  };

  var getYearlyExpenses = function(year){
    var yearly_budget = line_items.map(
      function(x) { return getYearlyLineItem(x, year)}
    );
    return yearly_budget;
  };

  var getYearlyData = function(year){
    var d = getNestedData(year);

    var data = _.map(d, function(val , key){
      var agencyChildren = getAgencyChildren(val);
      return {
        "name" : key,
        "children" : agencyChildren,
        "size" : _.reduce(agencyChildren, function(sum, num){
        return sum + num.size;},0)
      };
    });

    return data;
  };

  var getNestedData = function(year){
    var data2 = d3.nest()
      .key(function(d) {return d['agency_name'];})
      .key(function(d) {return d['bureau_name'];})
        //.rollup(function(leaves) { return {
          //"length" :leaves.length,
          //"size" : d3.sum(leaves, function(d){return parseInt(d[year]);})
           //} })
      .map(getYearlyExpenses(year));
    return data2;
  };

  var getAgencyChildren = function(r){
   var agency_children = _.map(r, function(val, key){
     return {
       "name" : key,
       "children" : val,
       "size" : _.reduce(val, function(sum, num){
         return sum + num.size;}, 0)
     };
   });

   return agency_children;
  };
//});
