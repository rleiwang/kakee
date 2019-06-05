package biz.kakee.errors;

public class MemberOffline extends RuntimeException {
    public MemberOffline() {
        super("member is offline");
    }
}
