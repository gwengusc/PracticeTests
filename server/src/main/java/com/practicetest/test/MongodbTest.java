package com.practicetest.test;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.MongoIterable;
import org.bson.Document;

import java.util.ArrayList;
import java.util.List;

public class MongodbTest {

    public static final String connectionString = "mongodb+srv://guifan_weng:Wyz420287@practicetestsdb.wkusfif.mongodb.net/?retryWrites=true&w=majority";
//    public static final String connectionString = "mongodb+srv://guifan_weng:Wyz420287@practicetestsdb-pe-0.wkusfif.mongodb.net/?retryWrites=true&w=majority";

    public static void testConnection(String connectionString) {
        try (MongoClient mongoClient = MongoClients.create(connectionString)) {
            List<Document> databases = mongoClient.listDatabases().into(new ArrayList<>());
            databases.forEach(db -> System.out.println(db.toJson()));
        }
    }

    public static String getCollections(String connectionString) {
        try (MongoClient mongoClient = MongoClients.create(connectionString)) {
            MongoDatabase db = mongoClient.getDatabase("test");
            MongoIterable<String> list = db.listCollectionNames();
            StringBuffer collections = new StringBuffer();
            for (String name : list) collections.append(name+" ");
            return collections.toString();
        }
    }

    public static void main(String[] args) {

        String collections = MongodbTest.getCollections(MongodbTest.connectionString);
        System.out.println("hehe: " + collections);
    }
}
