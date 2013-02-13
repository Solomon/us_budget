var a = 5;

line_items = []
d3.csv('/us_budget_expenses_2013.csv', function(csv){
  $.each(csv, function(row, data){
    line_items.push(data);
  });
});

var getField = function(item, field){
  return item[field];
};

var getLineItem = function(item){
  return [item['Agency Name'], item['Bureau Name'], item['Account Name']];
};

var getYearlyLineItem = function(item, year){
  var line_item_cost = getLineItem(item);
  line_item_cost.push(item[year]);
  return line_item_cost;
};

var getYearlyExpenses = function(year){
  var yearly_budget = line_items.map(
    function(x) { return getYearlyLineItem(x, year)}
  );
  return yearly_budget;
};
