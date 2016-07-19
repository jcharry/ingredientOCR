var express = require('express');
var router = express.Router();
var multer = require('multer');
var tesseract = require('node-tesseract');
var fs = require('fs');
var database = require('../database.json');
var ignoreList = require('../ignore.json');

var vision = require('node-cloud-vision-api');
var google = require('googleapis');
var keys = require('../APIKEY.json');
console.log(keys.APIKEY);
vision.init({auth: keys.APIKEY});


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('home');
});
router.get('/search', function(req, res, next) {
    console.log(req.query);

    res.send('hi');
});

// post method for saving image, then sending it to google cloud vision API 
router.post('/', function(req, res, next) {

    var base64String = req.body.base64_image;
    var clippedString = base64String.replace('data:image/jpeg;base64,','');

    var bitmap = new Buffer(clippedString, 'base64');

    // Write buffer to file
    var filename = 'ingredient_list' + Date.now() + '.jpg';
    console.log(filename);
    fs.writeFileSync('./uploads/'+filename, bitmap);
    console.log('*** File Created from Bitmap ***'); 


    // construct parameters
    const visionRequest = new vision.Request({
        image: new vision.Image('./uploads/'+filename),
        features: [
            new vision.Feature('TEXT_DETECTION', 1),
        ]
    });
 
    // send single request
    vision.annotate(visionRequest).then((visionResponse) => {
        // handling response
        var ingredients = visionResponse.responses[0].textAnnotations[0].description;
        var response = {};
        
        // Replace newline characters
        ingredients = ingredients.replace(/\r?\n|\r/g,' ');     // remove all newline characters 
        ingredients = ingredients.replace(/\*/g,'');            // remove all '*' characters
        ingredients = ingredients.replace(/\.|:|\(|\)/g, ',');  // replace all periods, colons, and parentheses with commas

        // split string by commas
        ingredientsList = ingredients.split(',');
        var afterIngredients = false;
        for (var i = 0; i < ingredientsList.length; i++) {
            var ingredient = ingredientsList[i];

            // Remove whitespace from both ends of each string
            ingredient = ingredient.trim();
            ingredient = ingredient.toLowerCase();
            //if (ingredient === 'ingredient' || ingredient === 'ingredients' || ingredient === 'to preserve freshness' || ingredient ==='') continue;
            
            // We want to ignore any junk before the term 'ingredients',
            // throw a flag letting us know when we've hit it
            if (ingredient === 'ingredients' || ingredient === 'ingredient') {
                afterIngredients = true;
            }

            if (afterIngredients) {
                if (ignoreList.indexOf(ingredient) !== -1) continue;    // Exit this loop if the ingredient should be ingored
                ingredientsList[i] = ingredient;

                
                // Does the ingredient exist in the database
                if (database[ingredient]) {
                    if (database[ingredient].redirect) {
                        response[ingredient] = {
                            name: ingredient,
                            data: database[database[ingredient].redirect]
                        };
                    } else {
                        response[ingredient] = {
                            name: ingredient,
                            data: database[ingredient]
                        };
                    }
                } else {
                    response[ingredient] = {
                        name: ingredient,
                        data: 'no data'
                    };
                }
                // Does the ingredient exist in the database with an exactly matched name, or a name matched in 'otherNames' array
                //for (var prop in database) {
                    //var item = database[prop];
                    //if 
                //}
            }
        }


        var bigList = fs.readFileSync('bigList.json');
        bigList = JSON.parse(bigList);

        // Add ingredients to full list only if they don't already exist
        for (var i = 0; i < ingredientsList.length; i++) {
            var ingredient = ingredientsList[i];
            if (!(ingredient == 'Ingredients' || ingredient === 'ingredients')) {
                if (bigList.indexOf(ingredient) === -1) {
                    bigList.push(ingredientsList[i]);
                } else {
                    console.log(ingredient + ' already exists in list');
                }
            }
        }

        console.log(response);

        fs.writeFileSync('bigList.json', JSON.stringify(bigList));

        res.send(JSON.stringify(response));

        }, (e) => {

        console.log('Error: ', e);
    });
});

//router.post('/', multer({dest: 'uploads/'}).single('img'), function(req, res, next) {
	//console.log(req.file);

    
    //tesseract.process(req.file.path, function(err, text) {
        //if (err) {
            //console.log(err);
            //res.status(404);
            //res.end();
        //} else {

            //console.log(text);
            //res.send('home', {text: text});
        //}
    //});

//});

module.exports = router;
