package com.practicetest.controller;

import com.practicetest.Constants;
import com.practicetest.test.MongodbTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/health")
@CrossOrigin("*")
public class ServerHealthController {

    private String connectionString;

    private Environment env;

    @Autowired
    public ServerHealthController(Environment env) {
        this.env = env;
        this.connectionString = getConnectionString();
    }

    private String getConnectionString() {
        String stage = env.getProperty(Constants.STAGE_NAME);
        stage = stage == null ? Constants.STAGE_LOCAL : stage.toUpperCase();
        return env.getProperty(Constants.MONGODB_CONNECTION_STRING + "_" + stage);
    }

    @GetMapping
    public String healthCheck() {
        String stage = env.getProperty(Constants.STAGE_NAME);
        stage = stage == null ? "local" : stage;
        try {
            MongodbTest.testConnection(connectionString);
            return "The server is healthy in stage of " + stage;
        } catch (Exception exception) {
            return "The connection to mongodb failed with the error: " + exception;
        }
    }

    @GetMapping("/collections")
    public String healthCheckForCollections() {
        return "Collections: " + MongodbTest.getCollections(connectionString);
    }
}
