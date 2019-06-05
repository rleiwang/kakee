package biz.kakee.errors;

public class MemberClose extends RuntimeException {
    public MemberClose() {
        super("Member is close");
    }
}
