FROM jdk8:kakee

ADD kakee.tar /

# dropwizard
# 9190 regular port
# 9191 admin port

# aeron
# 16888 unicast
EXPOSE 9190 9191 16888/udp

WORKDIR /kakee

CMD ["bin/kakee", "server", "conf/config.yml"]
