# Server Side OCR for Food Label App #
Sends a request to google cloud vision to pull out text from an image. Responds to device with list of ingredients, and any relevent data (i.e. if one of the ingredients is found within the database). If an ingredient is not captured by the database, the app will fetch the ingredient from Wikipedia.
