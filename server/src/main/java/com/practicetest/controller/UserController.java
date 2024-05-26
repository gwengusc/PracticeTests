package com.practicetest.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/user")
@CrossOrigin("*")
public class UserController {

    @GetMapping
    public Map<String, String> helloWorld(){
        return new HashMap<>(){{
            put("name", "testName");
            put("id", "testId");
        }};
    }
}
