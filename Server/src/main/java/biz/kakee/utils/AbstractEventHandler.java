package biz.kakee.utils;

import com.google.common.eventbus.AsyncEventBus;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public abstract class AbstractEventHandler {
    protected static final ExecutorService es = Executors.newFixedThreadPool(2);
    protected static final AsyncEventBus asyncEventBus = new AsyncEventBus(es);

    protected AbstractEventHandler() {
        asyncEventBus.register(this);
    }
}