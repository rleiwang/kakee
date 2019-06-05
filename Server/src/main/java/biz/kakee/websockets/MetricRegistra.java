package biz.kakee.websockets;

import com.codahale.metrics.MetricRegistry;
import lombok.Getter;
import lombok.Setter;

public final class MetricRegistra {
    @Getter
    @Setter
    private static MetricRegistry metricRegistry;
}
