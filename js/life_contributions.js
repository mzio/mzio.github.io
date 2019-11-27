function loadJSON(callback) {
  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
  xobj.open("GET", "commits.json", true); // Replace 'my_data' with the path to your file
  xobj.onreadystatechange = function() {
    if (xobj.readyState == 4 && xobj.status == "200") {
      // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}

function init() {
  loadJSON(function(response) {
    // Parse JSON string into object
    var actual_JSON = JSON.parse(response);
    console.log(actual_JSON);
  });
  var colorMap = categories;
  var colorWeights = {};
  for (var key in colorMap) {
    colorWeights[key] = 0;
  }
  return colorMap, colorWeights;
}

function lifeContributions() {
  // defaults
  var width = 600;
  var height = 110; // 110, 60
  var legendWidth = 150; //
  var selector = ".js-contributions";
  var SQUARE_LENGTH = 10;
  var SQUARE_PADDING = 8;
  var MONTH_LABEL_PADDING = 6;
  var now = moment()
    .endOf("day")
    .toDate();
  var yearAgo = moment()
    .startOf("day")
    .subtract(2, "month")
    .toDate();
  var startDate = null;
  var counterMap = {};
  var colorMap = {};
  var data = [];
  var max = null;
  var colorRange = ["#D8E6E7", "#218380"];
  var tooltipEnabled = false;
  var tooltipUnit = "contribution";
  var legendEnabled = true;
  var onClick = null;
  var weekStart = 0; //0 for Sunday, 1 for Monday
  var displayMonthRange = false;
  var locale = {
    months: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ],
    days: ["S", "M", "T", "W", "T", "F", "S"],
    No: "No",
    on: "on",
    Less: "Less",
    More: "More"
  };
  var v = Number(d3.version.split(".")[0]);

  const sumValues = obj => Object.values(obj).reduce((a, b) => a + b);

  // setters and getters
  chart.data = function(value) {
    if (!arguments.length) {
      return data;
    }
    data = value;

    counterMap = {};
    categoryCountsMap = {};
    colorMap = {};
    categoryColorMap = {
      life: "hsl(288, 100%, 35%)",
      logistics: "hsl(0, 100%, 50%)",
      research: "hsl(245, 100%, 50%)",
      school: "hsl(55, 100%, 35%)",
      side_projects: "hsl(144, 100%, 35%)"
    };

    for (var key in data) {
      date = moment(key).format("YYYY-MM-DD");
      counterMap[date] = sumValues(data[key]["counts"]);
      categoryCountsMap[date] = data[key]["counts"];
      colorMap[date] = data[key]["hsl"];
    }

    return chart;
  };

  chart.max = function(value) {
    if (!arguments.length) {
      return max;
    }
    max = value;
    return chart;
  };

  chart.selector = function(value) {
    if (!arguments.length) {
      return selector;
    }
    selector = value;
    return chart;
  };

  chart.startDate = function(value) {
    if (!arguments.length) {
      return startDate;
    }
    yearAgo = value;
    now = moment(value)
      .endOf("day")
      .add(1, "year")
      .toDate();
    return chart;
  };

  chart.colorRange = function(value) {
    if (!arguments.length) {
      return colorRange;
    }
    colorRange = value;
    return chart;
  };

  chart.tooltipEnabled = function(value) {
    if (!arguments.length) {
      return tooltipEnabled;
    }
    tooltipEnabled = value;
    return chart;
  };

  chart.tooltipUnit = function(value) {
    if (!arguments.length) {
      return tooltipUnit;
    }
    tooltipUnit = value;
    return chart;
  };

  chart.legendEnabled = function(value) {
    if (!arguments.length) {
      return legendEnabled;
    }
    legendEnabled = value;
    return chart;
  };

  chart.onClick = function(value) {
    if (!arguments.length) {
      return onClick();
    }
    onClick = value;
    return chart;
  };

  chart.locale = function(value) {
    if (!arguments.length) {
      return locale;
    }
    locale = value;
    return chart;
  };

  function chart() {
    d3.select(chart.selector())
      .selectAll("svg.calendar-heatmap")
      .remove(); // remove the existing chart, if it exists

    var dateRange = ((d3.time && d3.time.days) || d3.timeDays)(yearAgo, now); // generates an array of date objects within the specified range
    var monthRange = ((d3.time && d3.time.months) || d3.timeMonths)(
      moment(yearAgo)
        .startOf("month")
        .toDate(),
      now
    ); // it ignores the first month if the 1st date is after the start of the month
    var firstDate = moment(dateRange[0]);
    if (chart.data().length == 0) {
      max = 0;
    } else if (max === null) {
      max = d3.max(chart.data(), function(d) {
        return d.count;
      }); // max data value
    }

    // color range
    var color = ((d3.scale && d3.scale.linear) || d3.scaleLinear)()
      .range(chart.colorRange())
      .domain([0, max]);

    var tooltip;
    var dayRects;

    drawChart();

    function drawChart() {
      if (displayMonthRange) {
        d3.select(chart.selector())
          .append("div")
          .attr("class", "caption")
          .attr("width", width)
          .html(getDateRange());
      }

      var svg = d3
        .select(chart.selector())
        .style("position", "relative")
        .style("text-align", "center")
        .append("svg")
        .attr("class", "svg-graph")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + width + " " + height)
        .classed("svg-responsive", true)
        .attr("width", width)
        .attr("height", height);

      dayRects = svg.selectAll(".day-cell").data(dateRange); //  array of days for the last yr

      var enterSelection = dayRects
        .enter()
        .append("rect")
        .attr("class", "day-cell")
        .attr("width", SQUARE_LENGTH)
        .attr("height", SQUARE_LENGTH)
        .attr("fill", function(d) {
          return colorForDate(d, false);
        })
        .attr("x", function(d, i) {
          var cellDate = moment(d);
          var result =
            (cellDate.date() +
              12 * (cellDate.weekYear() - firstDate.weekYear())) *
            1;
          //   console.log(result * (SQUARE_LENGTH + SQUARE_PADDING));
          return result * (SQUARE_LENGTH + SQUARE_PADDING) - 10;
        })
        .attr("y", function(d, i) {
          return 0 + d.getMonth() * (SQUARE_LENGTH + SQUARE_PADDING) - 100;
        });
      // .style("stroke", function(d) {
      //   return colorForDate(d, true);
      // })
      // .style("stroke-width", 1);

      if (typeof onClick === "function") {
        (v === 3 ? enterSelection : enterSelection.merge(dayRects)).on(
          "click",
          function(d) {
            d3.select(".tooltipMore")
              .style("visibility", "visible")
              .style("opacity", 1);
          }
        );
      }

      if (chart.tooltipEnabled()) {
        (v === 3 ? enterSelection : enterSelection.merge(dayRects))
          .on("mouseover", function(d, i) {
            tooltip = d3
              .select(chart.selector())
              .append("div")
              .attr("class", "tooltip")
              .html(tooltipHTMLForDate(d));
            tooltipMore = d3
              .select(chart.selector())
              .append("div")
              .html(allCountsForDate(d))
              .attr("class", "tooltipMore");
          })
          .on("mouseout", function(d, i) {
            tooltip.remove();
            tooltipMore.remove();
          });
      }
    }

    function pluralizedTooltipUnit(count) {
      if ("string" === typeof tooltipUnit) {
        return tooltipUnit + (count === 1 ? "" : "s");
      }
      for (var i in tooltipUnit) {
        var _rule = tooltipUnit[i];
        var _min = _rule.min;
        var _max = _rule.max || _rule.min;
        _max = _max === "Infinity" ? Infinity : _max;
        if (count >= _min && count <= _max) {
          return _rule.unit;
        }
      }
    }

    function tooltipHTMLForDate(d) {
      var dateStr = moment(d).format("ddd, MMM Do YYYY");
      var count = countForDate(d);
      return (
        "<span>" +
        (count ? count : locale.No) +
        " " +
        pluralizedTooltipUnit(count) +
        " " +
        locale.on +
        " " +
        dateStr +
        "</span>"
      );
    }

    function getDateRange() {
      var firstMonth = locale["months"][moment(dateRange[0]).month()];
      var lastDate = moment(dateRange[-1]);
      var lastMonth = locale["months"][lastDate.month()];
      var lastYear = lastDate.year();
      return (
        "<span>[ " +
        firstMonth +
        " to " +
        lastMonth +
        " " +
        lastYear +
        " ]</span>"
      );
    }

    function countForDate(d) {
      var key = moment(d).format("YYYY-MM-DD");
      return counterMap[key] || 0;
    }

    function allCountsForDate(d) {
      var key = moment(d).format("YYYY-MM-DD");
      var counts = [];
      console.log(categoryCountsMap[key]);
      for (var countKey in categoryCountsMap[key]) {
        var count = categoryCountsMap[key][countKey];
        if (count > 0) {
          counts.push(
            "<span style='color: " +
              categoryColorMap[countKey] +
              "'>" +
              count +
              " " +
              countKey +
              "</span>"
          );
        }
      }
      console.log(counts);
      if (counts.length > 0) {
        return "(" + counts.join(", ") + ")";
      } else {
        return "";
      }
    }

    function colorForDate(d, outline) {
      var key = moment(d).format("YYYY-MM-DD");
      color = d3.color(colorMap[key]) || d3.color("hsl(0, 0%, 85%)");
      if (outline) {
        color.l = 0.85 - color.s;
        color.s = 0;
        return color;
      } else {
        return color;
      }
    }

    function formatWeekday(weekDay) {
      if (weekStart === 1) {
        if (weekDay === 0) {
          return 6;
        } else {
          return weekDay - 1;
        }
      }
      return weekDay;
    }
  }

  return chart;
}
