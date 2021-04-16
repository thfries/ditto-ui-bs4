# ditto-ui-bs4
This is a simple debug UI for [Eclipse Ditto](https://www.eclipse.org/ditto/). It is implemented with plain HTML and JavaScript using Bootstrap 4 and jQuery (almost vanilla JS). 

## Features
- Search Things
- Maintain attributes of things
- Maintain features of things
- Send live messages to features
- Maintain policies of things
- Maintain connections
- Supports ditto and Bosch IoT Things APIs

## Open Issues
Yes, e.g.:
- Search parameters for searching things
- Paging for big lists
- Treatment for Namespaces
- Create Thing
- Message to Thing
- ...?

## Frontend screenshots

![](./images/screenshot.png)
![](./images/screenshotPolicy.png)
![](./images/screenshotConnections.png)

## Installation
The UI consists only of a static web content. You can:
- Option 1: use it directly from the github repository e.g. by
```
https://cdn.statically.io/gh/thfries/ditto-ui-bs4/main/index.html
```
- Option 2: Copy into your project and change your nginx configuration to serve the files
- Option 3: Use the docker nginx image, e.g. by
```
docker run -it --rm -d -p 8085:80 --name ditto-ui -v "~/ditto-ui-bs4:/usr/share/nginx/html" nginx
```
 

## Usage
### Initial Setup
Configure your settings:
- For Bosch IoT Things set "useBasicAuth" to false and set a Bearer token for your OAuth2 client and (for managing connections) your solution Id
- For Ditto set "useBasicAuth" to true and set a usernamePassword separated by a colon ("username:password")

### General Usage
Click on the Headlines to open and collapse areas.

You can click on entries in tables to fill in the key/value fields.
Press the save button for either action:
- For an existing key if the value field is set: Perform an **UPDATE** for the existing entry.
- For an existing key if the value is empty: **DELETE** the existing entry. (in case of a feature, all value fields need to be empty)
- For an non-existing key: **CREATE** a new entry. 

## Dependencies
The UI uses
- [Bootstrap 4](https://getbootstrap.com)
- [jQuery](https://jquery.com)
- [Font Awesome](https://fontawesome.com) for the buttons

