//jshint esversion: 6
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://admin-sam:Test123@cluster0-oql7h.mongodb.net/todolistDB",
{
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set('useFindAndModify', false);

//database storing each item entry
const itemsSchema = {
  name: String,
  time: Number,
  date: String,
  dateFinished: Number,
  units: String
};

const Item = mongoose.model("item", itemsSchema);

//default items to start off the list
const item1 = new Item ({
  name: "Welcome to your to-do list!"
});

const item2 = new Item ({
  name: "Hit + to add a new item."
});

const item3 = new Item ({
  name: "<-- Hit this to complete an item."
});

const defaultItems = [item1, item2, item3];

//database storing seperate lists i.e: work/school list
const listSchema = {
  name: String,
  items: [itemsSchema],
};

const List = mongoose.model("List", listSchema);


//home page
app.get("/", function(req, res) {

  Item.find({}, function(err, foundItems) {
    if (foundItems.length === 0) { //adds default items
      Item.insertMany(defaultItems, function(err) {
        if(err) {
          console.log(err);
        } else {
          console.log("Succesfully inserted");
        }
      });
      res.redirect("/");
    } else {
      res.render("list", {listTitle: "Today", newListItems : foundItems});
    }
  });
});

//when + button is pressed
app.post("/", function(req, res) {
  //posts items
  const itemName = req.body.newItem;
  const listName = req.body.list;
  var time = new Date().getTime();
  var date = new Date(time).toString().substring(4,15);
  const item = new Item ({
    name: itemName,
    time: time,
    date: date,
    dateFinished: "",
    units: "Not finished yet"
  });

  if (listName === "Today") {
    console.log(item.name);
    item.save();
    res.redirect("/");
  } else {
    List.findOne({name: listName}, function(err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }

});

app.post("/delete", function(req, res) {
  const listName = req.body.listName;
  const checkedItemId = req.body.checkbox;
  let dateEnd = new Date();
  dateEnd = dateEnd.getTime();
  if (listName === "Today") {
    Item.findOne({_id: checkedItemId}, function(err, item) {
      if (!err) {
        let elapsed = dateEnd - item.time;
        let elapsedString = "seconds";
        elapsed /= 1000;
        console.log(elapsed);
        if (elapsed > 86400) {
          elapsed /= 86400;
          elapsedString = "days";
        }
        if (elapsed > 3600) {
          elapsed /= 3600;
          elapsedString = "hours";
        }
        if (elapsed > 60) {
          elapsed /= 60;
          elapsedString = "minutes";
        }
        elapsed = Math.round(elapsed);
        console.log(checkedItemId);
        Item.findOne({_id: checkedItemId}, function(err, item) {
          if(err) {
            console.log(err);
          } else {
            if (item != null && item.name.substring(0,10) != "completed:") {
              const item1 = new Item ({
                name: "completed: " + item.name,
                time: item.time,
                date: item.date,
                dateFinished: elapsed,
                units: elapsedString
              });
              item1.save();
            }
          }
        });
        Item.findByIdAndRemove(checkedItemId, function(err){
          if (!err) {
            console.log("Successfully deleted checked item.");
            res.redirect("/");
          }
        });
      }
    });
  } else {
    List.findOne({name: listName}, function(err, foundList){
      if (!err){
        for (var i = 0; i < foundList.items.length; i++)
        {
          if (foundList.items[i]._id == checkedItemId) {
            let elapsed = dateEnd - foundList.items[i].time;
            let elapsedString = "seconds";
            elapsed /= 1000;
            if (elapsed > 86400) {
              elapsed /= 86400;
              elapsedString = "days";
            }
            if (elapsed > 3600) {
              elapsed /= 3600;
              elapsedString = "hours";
            }
            if (elapsed > 60) {
              elapsed /= 60;
              elapsedString = "minutes";
            }
            elapsed = Math.round(elapsed);
            foundList.items[i].dateFinished = elapsed;
            foundList.items[i].units = elapsedString;
          }
        }
        foundList.save();
        res.redirect("/" + listName);
      }
    });
  }
});

app.get("/:parameter", function(req, res) {
  parameter = _.capitalize(req.params.parameter);

  List.findOne({name: parameter}, function(err, foundList) {
    if(!err) {
      if(!foundList) {
        //Create a new list
        const list = new List ({
          name: parameter,
          items: defaultItems
        });

        list.save();
        res.redirect("/" + parameter);
      } else {
        //Show existing list
        res.render("list", {listTitle: foundList.name, newListItems : foundList.items});
      }
    }
  });

});


app.get("/about", function(req, res){
  res.render("about");
});

// app.get("/finished/:parameter", function(req, res) {
//   Item.find({}, function(err, foundItems) {
//     res.render("finished");
//     console.log(foundItems);
//   });
// });

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server Started...");
});
