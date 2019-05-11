const AWS = require('aws-sdk');
const fs = require('fs');
var path = require('path');
var moment = require('moment');

AWS.config.update({
    region: 'sa-east-1',
    accessKeyId: "AKIATLSLFQ2JAUXABS7B",
    secretAccessKey: "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"
});

var docClient = new AWS.DynamoDB.DocumentClient();

var s3 = new AWS.S3();

var table = "contactosTable";

module.exports = {
    show: function (req, res) {
        var params = {
            TableName: table,
            ProjectionExpression: "ctcId, nombre, apellidos, email, nacimiento, foto"
        };
        docClient.scan(params, function (err, items) {
            if (err) {
                console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Scan succeeded.");
                res.render('index', { items: items, moment: moment });
            }
        });
    },

    detail: function (req, res) {
        let val_id = req.params.id;
        var paramsDynamo = {
            TableName: table,
            Key: {
                "ctcId": val_id
            }
        };
        docClient.get(paramsDynamo, function (err, item) {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("GetItem succeeded:", JSON.stringify(item, null, 2));
                res.render('actualizar', { item: item, moment: moment });
            }
        });
    },

    add: function (req, res) {
        res.render('crear');
    },

    create: function (req, res) {
        let fotoname = Date.now() + "_" + path.basename(req.files.archivo.name);
        var paramsBucket = {
            Bucket: 'contactos.callupe.pe.edu.tecsup',
            Body: fs.createReadStream(req.files.archivo.path),
            Key: fotoname
        };
        var paramsDynamo = {
            TableName: table,
            Key: {
                "ctcId": req.fields.id,
            },
            Item: {
                "ctcId": req.fields.id,
                "nombre": req.fields.nombre,
                "apellidos": req.fields.apellidos,
                "email": req.fields.email,
                "nacimiento": req.fields.nacimiento,
                "foto": fotoname
            }
        };
        s3.upload(paramsBucket, function (err, data) {
            if (err) {
                console.log("Error", err);
            }
            if (data) {
                docClient.put(paramsDynamo, function (err, data) {
                    if (err) {
                        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                    } else {
                        res.redirect('./');
                        console.log("Added item:", JSON.stringify(data, null, 2));
                    }
                });
                console.log("Uploaded in:", data.Location);
            }
        });
    },

    update: function (req, res) {
        var paramsDynamo = {
            TableName: table,
            Key: {
                "ctcId": req.fields.id
            }
        };
        docClient.get(paramsDynamo, function (err, item) {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                var paramsBucket = {
                    Bucket: 'contactos.callupe.pe.edu.tecsup',
                    Key: item.Item.foto
                };
                s3.deleteObject(paramsBucket, function (err, data) {
                    if (err) {
                        console.log(err, err.stack);
                    } else {
                        let fotoname = Date.now() + "_" + path.basename(req.files.archivo.name);
                        var paramsnewBucket = {
                            Bucket: 'contactos.callupe.pe.edu.tecsup',
                            Body: fs.createReadStream(req.files.archivo.path),
                            Key: fotoname
                        };
                        s3.upload(paramsnewBucket, function (err, data) {
                            if (err) {
                                console.log("Error", err);
                                res.redirect('./');
                            }
                            if (data) {
                                console.log("Updating the item...");
                                var paramsnewDynamo = {
                                    TableName: table,
                                    Key: {
                                        "ctcId": req.fields.id
                                    },
                                    UpdateExpression: "set nombre = :n, apellidos = :a, email = :e, nacimiento = :na, foto = :f",
                                    ExpressionAttributeValues: {
                                        ":n": req.fields.nombre,
                                        ":a": req.fields.apellidos,
                                        ":e": req.fields.email,
                                        ":na": req.fields.nacimiento,
                                        ":f": fotoname
                                    },
                                    ReturnValues: "UPDATED_NEW"
                                };
                                docClient.update(paramsnewDynamo, function (err, data) {
                                    if (err) {
                                        console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
                                    } else {
                                        console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
                                    }
                                });
                                res.redirect('./');
                            }
                        });
                    }
                });
            }
        });
    },

    delete: function (req, res) {
        let val_id = req.fields.id;
        var paramsDynamo = {
            TableName: table,
            Key: {
                "ctcId": val_id
            }
        };
        docClient.get(paramsDynamo, function (err, item) {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("GetItem succeeded:", JSON.stringify(item, null, 2));
                var paramsBucket = {
                    Bucket: "contactos.callupe.pe.edu.tecsup",
                    Key: item.Item.foto
                };
                s3.deleteObject(paramsBucket, function (err, foto) {
                    if (err) {
                        console.log(err, err.stack);
                    } else {
                        console.log("Attempting a conditional delete...");
                        docClient.delete(paramsDynamo, function (err, data) {
                            if (err) {
                                console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                            } else {
                                console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
                            }
                            res.redirect('./');
                        });
                    }
                });
            }
        });
    }
}
