package biz.kakee.pvo;

import lombok.Data;

import java.security.Principal;
import java.util.HashSet;
import java.util.Set;

@Data
public class User implements Principal {
    // role name must match enum Role, it is work around Annotation value must be constant
    public static final String CUSTOMER = "CUSTOMER";
    public static final String OPERATOR = "OPERATOR";

    public enum Role {
        CUSTOMER,
        OPERATOR
    }

    private String id;
    private String name;
    private final Set<Role> roles = new HashSet<>();
}
